<?php

declare(strict_types=1);

namespace App\Core\User\Access\Policy;

use App\Core\User\Access\Role;
use App\Core\User\Identity\User;

final class EditPolicy
{
    private const array HIERARCHY = [
        Role::MODERATOR->value => 1,
        Role::USER->value      => 0,
    ];

    public function canModifyAnother(User $victim, User $attacker): bool
    {
        $attacker_max = $this->getMaxLevel($attacker->getRoleEnums());
        $victim_max = $this->getMaxLevel($victim->getRoleEnums());

        return $attacker_max > $victim_max;
    }

    /**
     * @param list<Role> $roles
     */
    private function getMaxLevel(array $roles): int
    {
        $max = 0;
        foreach ($roles as $role) {
            $level = self::HIERARCHY[$role->value] ?? 0;
            if ($level > $max) {
                $max = $level;
            }
        }

        return $max;
    }
}
