<?php

declare(strict_types=1);

namespace App\Application\User\DTO;

use InvalidArgumentException;

use Symfony\Component\HttpFoundation\Request;

final readonly class AuthenticateUserInput
{
    private function __construct(
        public string $email,
        public string $password,
    ) {}

    public static function fromScalars(string $name, string $password): self
    {
        $name = trim($name);
        $password = trim($password);

        if ($name === '' || $password === '') {
            throw new InvalidArgumentException('USERNAME_AND_PASSWORD_MUST_BE_PROVIDED');
        }

        return new self($name, $password);
    }

    public static function fromHttpRequest(Request $request): self
    {
        $payload = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($payload)) {
            throw new InvalidArgumentException('BAD_REQUEST');
        }

        $name = $payload['name'] ?? '';
        $password = $payload['password'] ?? '';

        return self::fromScalars(
            is_string($name) ? $name : '',
            is_string($password) ? $password : ''
        );
    }
}
