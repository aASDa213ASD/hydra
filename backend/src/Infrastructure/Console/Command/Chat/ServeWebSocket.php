<?php

declare(strict_types=1);

namespace App\Infrastructure\Console\Command\Chat;

use App\Application\Channel\UseCase\JoinChannel;
use App\Application\Channel\DTO\ChannelNameInput;
use App\Core\Channel\Storage\ChannelMembershipRepositoryInterface;
use App\Core\Channel\Storage\ChannelRepositoryInterface;
use App\Core\User\Identity\User;
use App\Core\User\Storage\UserRepositoryInterface;
use JsonException;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use RuntimeException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(
    name: 'app:chat:ws',
    description: 'Start websocket chat server',
)]
final class ServeWebSocket extends Command
{
    /** @var array<int, array{stream: resource, id: int, user_id: ?int, username: ?string, ip: ?string, channels: array<string, bool>, authed: bool, auth_deadline: int}> */
    private array $clients = [];

    /** @var array<string, array<int, bool>> */
    private array $channel_subscribers = [];

    private int $next_client_id = 1;

    public function __construct(
        private readonly JWTTokenManagerInterface $jwt,
        private readonly UserRepositoryInterface $users,
        private readonly ChannelRepositoryInterface $channels,
        private readonly ChannelMembershipRepositoryInterface $memberships,
        private readonly JoinChannel $join_channel,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('host', null, InputOption::VALUE_OPTIONAL, 'Host to bind', '0.0.0.0')
            ->addOption('port', null, InputOption::VALUE_OPTIONAL, 'Port to bind', '8081')
            ->addOption('auth-timeout', null, InputOption::VALUE_OPTIONAL, 'Seconds before unauthenticated connection is dropped', '10');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $host = (string) $input->getOption('host');
        $port = (int) $input->getOption('port');
        $auth_timeout = (int) $input->getOption('auth-timeout');

        $server = @stream_socket_server("tcp://{$host}:{$port}", $errno, $errstr);
        if ($server === false) {
            throw new RuntimeException("Failed to start WS server: {$errstr} ({$errno})");
        }

        stream_set_blocking($server, false);
        $output->writeln("<info>WS server listening on {$host}:{$port}</info>");

        while (true) {
            $read = [$server];
            foreach ($this->clients as $client) {
                $read[] = $client['stream'];
            }

            $write = null;
            $except = null;
            if (stream_select($read, $write, $except, 1) === false) {
                continue;
            }

            foreach ($read as $stream) {
                if ($stream === $server) {
                    $this->acceptConnection($server, $auth_timeout, $output);
                    continue;
                }

                $client_id = $this->clientIdFromStream($stream);
                if ($client_id === null) {
                    continue;
                }

                $data = @fread($stream, 8192);
                if ($data === false) {
                    continue;
                }

                if ($data === '') {
                    if (feof($stream)) {
                        $this->disconnect($client_id);
                    }
                    continue;
                }

                $payload = $this->decodeFrame($data);
                if ($payload === null) {
                    $this->sendError($client_id, 'INVALID_FRAME');
                    continue;
                }

                $this->handleClientMessage($client_id, $payload);
            }

            $now = time();
            foreach (array_keys($this->clients) as $client_id) {
                $client = $this->clients[$client_id] ?? null;
                if ($client === null) {
                    continue;
                }

                if (!$client['authed'] && $now >= $client['auth_deadline']) {
                    $this->sendError($client_id, 'AUTH_TIMEOUT');
                    $this->disconnect($client_id);
                }
            }
        }
    }

    /** @param resource $server */
    private function acceptConnection($server, int $auth_timeout, OutputInterface $output): void
    {
        $conn = @stream_socket_accept($server, 0);
        if ($conn === false) {
            return;
        }

        stream_set_blocking($conn, true);
        $headers = '';
        while (!str_contains($headers, "\r\n\r\n")) {
            $line = fgets($conn);
            if ($line === false) {
                fclose($conn);
                return;
            }

            $headers .= $line;
        }

        if (!preg_match('/Sec-WebSocket-Key: (.*)\r\n/i', $headers, $matches)) {
            fclose($conn);
            return;
        }

        $key = trim($matches[1]);
        $accept = base64_encode(sha1($key . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', true));

        fwrite($conn, "HTTP/1.1 101 Switching Protocols\r\n");
        fwrite($conn, "Upgrade: websocket\r\n");
        fwrite($conn, "Connection: Upgrade\r\n");
        fwrite($conn, "Sec-WebSocket-Accept: {$accept}\r\n\r\n");

        stream_set_blocking($conn, false);

        $id = $this->next_client_id++;
        $peer = stream_socket_get_name($conn, true);
        $ip = null;
        if (is_string($peer) && $peer !== '') {
            $ip = explode(':', $peer)[0] ?? null;
        }
        $this->clients[$id] = [
            'stream' => $conn,
            'id' => $id,
            'user_id' => null,
            'username' => null,
            'ip' => is_string($ip) ? $ip : null,
            'channels' => [],
            'authed' => false,
            'auth_deadline' => time() + $auth_timeout,
        ];

        $output->writeln("<comment>Client connected #{$id}</comment>");
    }

    private function clientIdFromStream(mixed $stream): ?int
    {
        foreach ($this->clients as $id => $client) {
            if ($client['stream'] === $stream) {
                return $id;
            }
        }

        return null;
    }

    private function decodeFrame(string $data): ?array
    {
        $len = ord($data[1] ?? "\x00") & 127;
        $mask_offset = 2;

        if ($len === 126) {
            $mask_offset = 4;
            $len = unpack('n', substr($data, 2, 2))[1] ?? 0;
        } elseif ($len === 127) {
            return null;
        }

        $mask = substr($data, $mask_offset, 4);
        $payload = substr($data, $mask_offset + 4, $len);
        if ($mask === '' || strlen($mask) !== 4) {
            return null;
        }

        $decoded = '';
        for ($i = 0; $i < $len; $i++) {
            $decoded .= $payload[$i] ^ $mask[$i % 4];
        }

        try {
            $json = json_decode($decoded, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }

        return is_array($json) ? $json : null;
    }

    private function encodeFrame(array $payload): string
    {
        $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($json === false) {
            $json = '{}';
        }

        $len = strlen($json);
        if ($len <= 125) {
            return chr(0x81) . chr($len) . $json;
        }

        if ($len <= 65535) {
            return chr(0x81) . chr(126) . pack('n', $len) . $json;
        }

        return chr(0x81) . chr(127) . pack('J', $len) . $json;
    }

    private function handleClientMessage(int $client_id, array $payload): void
    {
        $op = $payload['op'] ?? null;
        if (!is_string($op) || $op === '') {
            $this->sendError($client_id, 'INVALID_OP');
            return;
        }

        if ($op === 'auth') {
            $token = $payload['token'] ?? null;
            if (!is_string($token) || $token === '') {
                $this->sendError($client_id, 'INVALID_TOKEN');
                return;
            }

            $user = $this->resolveUserFromToken($token);
            if ($user === null) {
                $this->sendError($client_id, 'AUTH_FAILED');
                $this->disconnect($client_id);
                return;
            }

            $this->clients[$client_id]['user_id'] = $user->id;
            $this->clients[$client_id]['username'] = $user->name;
            $this->clients[$client_id]['authed'] = true;
            $this->send($client_id, ['op' => 'auth_ok', 'user' => $user->name]);
            return;
        }

        if (!$this->isAuthed($client_id)) {
            $this->sendError($client_id, 'AUTH_REQUIRED');
            $this->disconnect($client_id);
            return;
        }

        if ($op === 'ping') {
            $this->send($client_id, ['op' => 'pong']);
            return;
        }

        if ($op === 'join') {
            $name = $payload['channel'] ?? null;
            if (!is_string($name)) {
                $this->sendError($client_id, 'INVALID_CHANNEL');
                return;
            }

            try {
                $join_started_at = microtime(true);
                $input = ChannelNameInput::fromScalars($name);
                $user_id = $this->clients[$client_id]['user_id'] ?? null;
                if (!is_int($user_id)) {
                    $this->sendError($client_id, 'AUTH_REQUIRED');
                    return;
                }
                $user = $this->users->findById($user_id);
                if (!$user instanceof User) {
                    $this->sendError($client_id, 'AUTH_REQUIRED');
                    return;
                }

                $channel = $this->join_channel->handle($user, $input);
                $channel_name = $channel->name;

                $this->clients[$client_id]['channels'][$channel_name] = true;
                $this->channel_subscribers[$channel_name][$client_id] = true;

                $this->send($client_id, ['op' => 'joined', 'channel' => $channel_name]);
                $this->sendBootstrapLines(
                    client_id: $client_id,
                    channel_name: $channel_name,
                    user: $user,
                    join_started_at: $join_started_at,
                );
                $this->broadcastJoinNotice($client_id, $channel_name, $user->name);
            } catch (\Throwable) {
                $this->sendError($client_id, 'JOIN_FAILED');
            }
            return;
        }

        if ($op === 'leave') {
            $name = $payload['channel'] ?? null;
            if (!is_string($name)) {
                $this->sendError($client_id, 'INVALID_CHANNEL');
                return;
            }

            $username = $this->clients[$client_id]['username'] ?? null;
            if (is_string($username) && $username !== '') {
                $this->broadcastLeaveNotice($client_id, $name, $username);
            }
            $this->unsubscribeClientFromChannel($client_id, $name);
            $this->send($client_id, ['op' => 'left', 'channel' => $name]);
            return;
        }

        if ($op === 'message') {
            $name = $payload['channel'] ?? null;
            $text = $payload['text'] ?? null;
            if (!is_string($name) || !is_string($text) || trim($text) === '') {
                $this->sendError($client_id, 'INVALID_MESSAGE');
                return;
            }

            $normalized = ChannelNameInput::fromScalars($name)->name;
            $user_id = $this->clients[$client_id]['user_id'] ?? null;
            if (!is_int($user_id)) {
                $this->sendError($client_id, 'AUTH_REQUIRED');
                return;
            }
            $user = $this->users->findById($user_id);
            if (!$user instanceof User) {
                $this->sendError($client_id, 'AUTH_REQUIRED');
                return;
            }
            $username = $this->clients[$client_id]['username'] ?? $user->name;
            if (!is_string($username) || $username === '') {
                $username = $user->name;
            }

            $channel_entity = $this->channels->findByName(substr($normalized, 1));
            if ($channel_entity === null) {
                $this->sendError($client_id, 'CHANNEL_NOT_FOUND');
                return;
            }

            $membership = $this->memberships->findByChannelAndUser($channel_entity, $user);
            if ($membership === null) {
                $this->sendError($client_id, 'NOT_IN_CHANNEL');
                return;
            }

            $subscribers = $this->channel_subscribers[$normalized] ?? [];
            $event = [
                'op' => 'message',
                'channel' => $normalized,
                'from' => $username,
                'text' => trim($text),
                'ts' => (new \DateTimeImmutable())->format(DATE_ATOM),
            ];

            foreach (array_keys($subscribers) as $subscriber_id) {
                $this->send($subscriber_id, $event);
            }
            return;
        }

        $this->sendError($client_id, 'UNKNOWN_OP');
    }

    private function isAuthed(int $client_id): bool
    {
        return ($this->clients[$client_id]['authed'] ?? false) === true;
    }

    private function resolveUserFromToken(string $token): ?User
    {
        try {
            $payload = $this->jwt->parse($token);
        } catch (\Throwable) {
            return null;
        }

        if (!is_array($payload)) {
            return null;
        }

        $uid = $payload['uid'] ?? null;
        if (!is_int($uid) && !is_string($uid)) {
            return null;
        }

        return $this->users->findById((int) $uid);
    }

    private function send(int $client_id, array $payload): void
    {
        $stream = $this->clients[$client_id]['stream'] ?? null;
        if (!is_resource($stream)) {
            return;
        }

        @fwrite($stream, $this->encodeFrame($payload));
    }

    private function sendError(int $client_id, string $error): void
    {
        $this->send($client_id, [
            'op' => 'error',
            'error' => $error,
        ]);
    }

    private function unsubscribeClientFromChannel(int $client_id, string $channel_name): void
    {
        unset($this->clients[$client_id]['channels'][$channel_name]);
        unset($this->channel_subscribers[$channel_name][$client_id]);

        if (empty($this->channel_subscribers[$channel_name])) {
            unset($this->channel_subscribers[$channel_name]);
        }
    }

    private function disconnect(int $client_id): void
    {
        $client = $this->clients[$client_id] ?? null;
        if ($client === null) {
            return;
        }

        $username = $client['username'] ?? null;
        foreach (array_keys($client['channels']) as $channel_name) {
            if (is_string($username) && $username !== '') {
                $this->broadcastLeaveNotice($client_id, $channel_name, $username);
            }
            $this->unsubscribeClientFromChannel($client_id, $channel_name);
        }

        $stream = $client['stream'];
        if (is_resource($stream)) {
            @fclose($stream);
        }

        unset($this->clients[$client_id]);
    }

    private function sendBootstrapLines(
        int $client_id,
        string $channel_name,
        User $user,
        float $join_started_at,
    ): void {
        $channel_entity = $this->channels->findByName(substr($channel_name, 1));
        if ($channel_entity === null) {
            return;
        }

        $users_in_channel = count($this->channel_subscribers[$channel_name] ?? []);
        $sync_seconds = microtime(true) - $join_started_at;
        $created_at = $channel_entity->created_at?->format('D M d H:i:s Y') ?? 'unknown';

        $lines = [
            [
                'text' => sprintf('Mode change [+i] for user %s', $user->name),
            ],
            [
                'text' => sprintf('Mode change [+w] for user %s', $user->name),
            ],
            [
                'text' => sprintf('ServerMode/%s [+nt] by hydra', $channel_name),
            ],
            [
                'text' => sprintf('Users (%s:%d/%d)', $channel_name, $users_in_channel, $users_in_channel),
            ],
            [
                'text' => sprintf('Channel %s was created at %s', $channel_name, $created_at),
            ],
            [
                'text' => sprintf('Join to %s was synced in %.3f sec', $channel_name, $sync_seconds),
            ],
        ];

        $this->send($client_id, [
            'op' => 'bootstrap_lines',
            'channel' => $channel_name,
            'lines' => $lines,
        ]);
    }

    private function broadcastJoinNotice(int $client_id, string $channel_name, string $username): void
    {
        $ip = $this->clients[$client_id]['ip'] ?? '0.0.0.0';
        if (!is_string($ip) || $ip === '') {
            $ip = '0.0.0.0';
        }

        $text = sprintf('%s [~%s@%s] has joined %s', $username, $username, $ip, $channel_name);
        $subscribers = $this->channel_subscribers[$channel_name] ?? [];
        foreach (array_keys($subscribers) as $subscriber_id) {
            $this->send($subscriber_id, [
                'op' => 'join_notice',
                'channel' => $channel_name,
                'text' => $text,
            ]);
        }
    }

    private function broadcastLeaveNotice(int $client_id, string $channel_name, string $username): void
    {
        $ip = $this->clients[$client_id]['ip'] ?? '0.0.0.0';
        if (!is_string($ip) || $ip === '') {
            $ip = '0.0.0.0';
        }

        $text = sprintf('%s [~%s@%s] has left %s', $username, $username, $ip, $channel_name);
        $subscribers = $this->channel_subscribers[$channel_name] ?? [];
        foreach (array_keys($subscribers) as $subscriber_id) {
            $this->send($subscriber_id, [
                'op' => 'leave_notice',
                'channel' => $channel_name,
                'text' => $text,
            ]);
        }
    }
}
