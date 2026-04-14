<?php

declare(strict_types=1);

namespace App\Application\User\Port;

interface PasswordVerifier
{
    public function verify(string $hashedPassword, string $plainPassword): bool;
}
