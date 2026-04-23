<?php

declare(strict_types=1);

namespace App\Application\User\UseCase;

use App\Application\User\DTO\RenameUserInput;
use App\Application\User\DTO\UserProfileView;
use App\Application\User\Exception\UserAlreadyExistsException;
use App\Core\User\Identity\User;
use App\Core\User\Storage\UserRepositoryInterface;

final readonly class RenameUser
{
    public function __construct(
        private UserRepositoryInterface $users,
    ) {}

    public function handle(User $user, RenameUserInput $input): UserProfileView
    {
        if ($user->name === $input->name) {
            return UserProfileView::fromUser($user);
        }

        $existing_user = $this->users->findByName($input->name);
        if ($existing_user !== null && $existing_user->id !== $user->id) {
            throw new UserAlreadyExistsException('USER_ALREADY_EXISTS');
        }

        $user->name = $input->name;
        $this->users->save($user);

        return UserProfileView::fromUser($user);
    }
}

