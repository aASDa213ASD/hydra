<?php

declare(strict_types=1);

namespace App\Application\User\UseCase;

use App\Application\User\DTO\AuthenticateUserInput;
use App\Application\User\DTO\AuthenticateUserResult;
use App\Application\User\Exception\InvalidCredentials;
use App\Application\User\Exception\UserNotFoundException;
use App\Application\User\Port\PasswordVerifier;
use App\Application\User\Port\TokenIssuer;
use App\Core\User\Storage\UserRepositoryInterface;
use DateTime;

final readonly class AuthenticateUser
{
    public function __construct(
        private UserRepositoryInterface $users,
        private PasswordVerifier $passwords,
        private TokenIssuer $tokens,
    ) {}

    public function handle(AuthenticateUserInput $input): AuthenticateUserResult
    {
        $user = $this->users->findByName($input->email);
        if (!$user) {
            throw new UserNotFoundException('USER_NOT_FOUND');
        }

        $hash = $user->password;
        if ($hash === null || !$this->passwords->verify($hash, $input->password)) {
            throw new InvalidCredentials('BAD_CREDENTIALS');
        }

        $user->last_login_at = new DateTime();
        $this->users->save($user);

        return AuthenticateUserResult::success($this->tokens->issue($user));
    }
}
