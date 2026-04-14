<?php

declare(strict_types=1);

namespace App\Application\User\DTO;

final readonly class AuthenticateUserResult
{
    private function __construct(
        public bool $success,
        public ?string $token = null,
        public ?string $error = null,
    ) {}

    public static function success(string $token): self
    {
        return new self(true, $token);
    }

    public static function failure(string $error): self
    {
        return new self(false, null, $error);
    }
}
