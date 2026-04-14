<?php

declare(strict_types=1);

namespace App\Core\User\Access;

enum Role: string
{
    case USER = 'ROLE_USER';
    case MODERATOR = 'ROLE_MODERATOR';

    /** @return list<self> */
    public static function all(): array
    {
        return [
            self::USER,
            self::MODERATOR,
        ];
    }
}
