<?php

declare(strict_types=1);

namespace App\Application\Channel\DTO;

use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Request;

final readonly class ChannelNameInput
{
    private const REGEX = '/^#[A-Za-z0-9._-]{1,32}$/';

    private function __construct(
        public string $name,
        public string $slug,
    ) {}

    public static function fromScalars(string $name): self
    {
        $name = trim($name);
        if ($name === '' || !preg_match(self::REGEX, $name)) {
            throw new InvalidArgumentException('INVALID_CHANNEL_NAME');
        }

        return new self(
            name: $name,
            slug: substr($name, 1),
        );
    }

    public static function fromHttpRequest(Request $request): self
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new InvalidArgumentException('INVALID_JSON_PAYLOAD');
        }

        $name = $payload['name'] ?? '';

        return self::fromScalars(
            is_string($name) ? $name : ''
        );
    }
}
