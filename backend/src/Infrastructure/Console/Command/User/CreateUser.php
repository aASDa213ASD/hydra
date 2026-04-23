<?php

declare(strict_types=1);

namespace App\Infrastructure\Console\Command\User;

use App\Core\User\Access\Role;
use App\Core\User\Identity\User;
use App\Core\User\Storage\UserRepositoryInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:user:create',
    description: 'Create a user with a username, password, and role.',
)]
final class CreateUser extends Command
{
    public function __construct(
        private readonly UserRepositoryInterface $user_repository,
        private readonly UserPasswordHasherInterface $password_hasher,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('username', InputArgument::REQUIRED, 'Username for the new user.')
            ->addArgument('password', InputArgument::REQUIRED, 'Plain-text password for the new user.')
            ->addArgument(
                'role',
                InputArgument::REQUIRED,
                sprintf('Role for the new user. Allowed values: %s', implode(', ', $this->allowedRoleValues())),
            );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $username_argument = $input->getArgument('username');
        $password_argument = $input->getArgument('password');
        $role_argument = $input->getArgument('role');

        $username = is_string($username_argument) ? trim($username_argument) : '';
        $plain_password = is_string($password_argument) ? $password_argument : '';
        $role_value = is_string($role_argument) ? strtoupper(trim($role_argument)) : '';

        if ($username === '') {
            $io->error('Username can not be empty.');

            return Command::INVALID;
        }

        if ($plain_password === '') {
            $io->error('Password can not be empty.');

            return Command::INVALID;
        }

        $role = Role::tryFrom($role_value);
        if ($role === null) {
            $io->error(sprintf(
                'Invalid role "%s". Allowed values: %s',
                $role_value,
                implode(', ', $this->allowedRoleValues()),
            ));

            return Command::INVALID;
        }

        if ($this->user_repository->findByName($username) !== null) {
            $io->error(sprintf('User "%s" already exists.', $username));

            return Command::FAILURE;
        }

        $user = new User();
        $user->name = $username;
        $user->password = $this->password_hasher->hashPassword($user, $plain_password);
        $user->setRoleEnums([$role]);

        $this->user_repository->save($user);

        $io->success(sprintf('User "%s" created with role "%s".', $username, $role->value));

        return Command::SUCCESS;
    }

    /** @return list<string> */
    private function allowedRoleValues(): array
    {
        return array_map(
            static fn (Role $role): string => $role->value,
            Role::all(),
        );
    }
}
