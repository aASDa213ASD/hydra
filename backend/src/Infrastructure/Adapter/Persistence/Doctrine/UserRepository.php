<?php

declare(strict_types=1);

namespace App\Infrastructure\Adapter\Persistence\Doctrine;

use App\Core\User\Identity\User;
use App\Core\User\Storage\UserRepositoryInterface;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<User> */
final class UserRepository extends ServiceEntityRepository implements UserRepositoryInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function save(User $user): void
    {
        $em = $this->getEntityManager();
        $em->persist($user);
        $em->flush();
    }

    public function remove(User $user): void
    {
        $em = $this->getEntityManager();
        $em->remove($user);
        $em->flush();
    }

    public function findById(int $id): ?User
    {
        $user = $this->find($id);

        return $user instanceof User ? $user : null;
    }

    public function findByName(string $name): ?User
    {
        return $this->findOneBy(['name' => $name]);
    }
}
