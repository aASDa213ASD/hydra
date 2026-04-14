<?php

declare(strict_types=1);

namespace App\Application\User\DTO;

use App\Core\User\Identity\User;
use JsonSerializable;

final readonly class UserProfileView implements JsonSerializable
{
    /**
     * @param list<string> $roles
     */
    private function __construct(
        public ?int $id,
        public string $name,
        public array $roles,
        public ?string $created_at,
        public ?string $updated_at,
        public ?string $last_login_at,
    ) {}

    public static function fromUser(User $user): self
    {
        return new self(
            id: $user->id,
            name: $user->name,
            roles: $user->getRoles(),
            created_at: $user->created_at?->format('Y-m-d H:i:s'),
            updated_at: $user->updated_at?->format('Y-m-d H:i:s'),
            last_login_at: $user->last_login_at?->format('Y-m-d H:i:s'),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'roles' => $this->roles,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'last_login_at' => $this->last_login_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function jsonSerialize(): array
    {
        return $this->toArray();
    }
}
