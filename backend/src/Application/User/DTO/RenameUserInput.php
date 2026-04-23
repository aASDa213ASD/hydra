<?php

declare(strict_types=1);

namespace App\Application\User\DTO;

use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Request;

final readonly class RenameUserInput
{
    private function __construct(
        public string $name,
    ) {}

    public static function fromScalars(string $name): self
    {
        $name = trim($name);
        if ($name === '') {
            throw new InvalidArgumentException('NAME_REQUIRED');
        }

        return new self($name);
    }

    public static function fromHttpRequest(Request $request): self
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            throw new InvalidArgumentException('INVALID_JSON_PAYLOAD');
        }

        $name = $payload['name'] ?? '';

        return self::fromScalars(
            is_string($name) ? $name : '',
        );
    }
}

