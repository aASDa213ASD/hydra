<?php

declare(strict_types=1);

namespace App\Infrastructure\Adapter\Security;

use App\Application\User\Port\TokenIssuer;

use App\Core\User\Identity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;

final readonly class JwtTokenIssuer implements TokenIssuer
{
    public function __construct(
        private JWTTokenManagerInterface $jwt
    ) {}

    public function issue(User $user): string
    {
        return $this->jwt->createFromPayload(
            $user, ['uid' => $user->id]
        );
    }
}
