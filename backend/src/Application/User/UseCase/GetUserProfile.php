<?php

declare(strict_types=1);

namespace App\Application\User\UseCase;

use App\Application\User\DTO\UserProfileView;
use App\Application\User\Port\UserProfilePictureProvider;
use App\Core\User\Identity\User;

final readonly class GetUserProfile
{
    public function __construct() {}

    public function handle(User $user): UserProfileView
    {
        return UserProfileView::fromUser(
            user: $user,
        );
    }
}
