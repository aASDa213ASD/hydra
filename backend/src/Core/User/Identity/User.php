<?php

declare(strict_types=1);

namespace App\Core\User\Identity;

use App\Core\User\Access\Role;
use App\Infrastructure\Adapter\Persistence\Doctrine\UserRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use DateTime;
use DateTimeZone;
use LogicException;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'users')]
#[ORM\HasLifecycleCallbacks]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\Column(name: 'id', type: Types::INTEGER)]
    #[ORM\GeneratedValue(strategy: 'AUTO')]
    public ?int $id = null
    {
        get => $this->id;
    }

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    public ?DateTime $created_at = null
    {
        get => $this->created_at;
        set => $this->created_at = $value;
    }

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    public ?DateTime $updated_at = null
    {
        get => $this->updated_at;
        set => $this->updated_at = $value;
    }

    #[ORM\Column(type: Types::STRING)]
    public string $name = ''
    {
        get => $this->name;
        set => $this->name = $value;
    }

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    public ?string $password = null
    {
        get => $this->password;
        set => $this->password = $value;
    }

    #[ORM\Column(name: 'last_login', type: Types::DATETIME_MUTABLE, nullable: true)]
    public ?DateTime $last_login_at = null
    {
        get => $this->last_login_at;
        set => $this->last_login_at = $value;
    }

    /** @var list<string> */
    #[ORM\Column(name: 'roles', type: Types::JSON)]
    public array $roles = []
    {
        get => $this->roles;
        set => $this->roles = $value;
    }

    public function __construct()
    {
        $this->roles = [];
    }

    public function __serialize(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
        ];
    }

    #[ORM\PrePersist]
    public function beforePersist(): void
    {
        $this->created_at = new DateTime('now', new DateTimeZone('UTC'));
    }

    #[ORM\PreUpdate]
    public function beforeUpdate(): void
    {
        $this->updated_at = new DateTime('now', new DateTimeZone('UTC'));
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    /** @return list<string> */
    public function getRoles(): array
    {
        $role_values = $this->roles;
        $role_values[] = Role::USER->value;

        return array_values(array_unique($role_values));
    }

    /** @return list<Role> */
    public function getRoleEnums(): array
    {
        $role_enums = [];
        foreach ($this->getRoles() as $role_value) {
            $role = Role::tryFrom($role_value);
            if ($role !== null) {
                $role_enums[$role->value] = $role;
            }
        }

        return array_values($role_enums);
    }

    public function hasRole(Role $role): bool
    {
        foreach ($this->getRoleEnums() as $existing_role) {
            if ($existing_role === $role) {
                return true;
            }
        }

        return false;
    }

    /** @param list<Role> $roles */
    public function setRoleEnums(array $roles): void
    {
        $role_values = [];
        foreach ($roles as $role) {
            if ($role instanceof Role) {
                $role_values[] = $role->value;
            }
        }

        $this->roles = array_values(array_unique($role_values));
    }

    public function getUserIdentifier(): string
    {
        if ($this->name === '') {
            throw new LogicException('USERNAME_CAN_NOT_BE_EMPTY');
        }

        return $this->name;
    }

    public function eraseCredentials(): void {}
}
