<?php

declare(strict_types=1);

namespace App\Application\User\Port;

use App\Core\User\Identity\User;

interface TokenIssuer
{
    public function issue(User $user): string;
}
