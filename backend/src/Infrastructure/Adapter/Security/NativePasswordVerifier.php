<?php

declare(strict_types=1);

namespace App\Infrastructure\Adapter\Security;

use App\Application\User\Port\PasswordVerifier;

final class NativePasswordVerifier implements PasswordVerifier
{
    public function verify(string $hashedPassword, string $plainPassword): bool
    {
        if ($hashedPassword === '') {
            return false;
        }

        return password_verify($plainPassword, $hashedPassword);
    }
}
