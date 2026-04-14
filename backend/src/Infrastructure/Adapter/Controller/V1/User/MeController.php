<?php

declare(strict_types=1);

namespace App\Infrastructure\Adapter\Controller\V1\User;

use App\Application\User\UseCase\GetUserProfile;
use App\Core\User\Identity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use InvalidArgumentException;
use RuntimeException;

final class MeController extends AbstractController
{
    public function __construct(
        private readonly GetUserProfile $get_profile,
    ) {}

    #[Route('/api/v1/me', name: 'api_me_get', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function getMe(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'NOT_USER_INSTANCE'], Response::HTTP_NOT_FOUND);
        }

        $profile = $this->get_profile->handle($user);

        return $this->json($profile->toArray());
    }
}
