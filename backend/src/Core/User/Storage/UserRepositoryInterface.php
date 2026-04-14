<?php

declare(strict_types=1);

namespace App\Core\User\Storage;

use App\Core\User\Identity\User;

interface UserRepositoryInterface
{
    public function save(User $user): void;

    public function remove(User $user): void;

    public function findById(int $id): ?User;

    public function findByName(string $name): ?User;
}
