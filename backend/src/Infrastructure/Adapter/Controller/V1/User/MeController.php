<?php

declare(strict_types=1);

namespace App\Infrastructure\Adapter\Controller\V1\User;

use App\Application\User\UseCase\GetUserProfile;
use App\Application\User\UseCase\RenameUser;
use App\Application\User\DTO\RenameUserInput;
use App\Application\User\Exception\UserAlreadyExistsException;
use App\Core\User\Identity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use InvalidArgumentException;

final class MeController extends AbstractController
{
    public function __construct(
        private readonly GetUserProfile $get_profile,
        private readonly RenameUser $rename_user,
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

    #[Route('/api/v1/me/rename', name: 'api_me_rename', methods: ['POST'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function rename(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof User) {
            return $this->json(['error' => 'NOT_USER_INSTANCE'], Response::HTTP_NOT_FOUND);
        }

        try {
            $input = RenameUserInput::fromHttpRequest($request);
            $profile = $this->rename_user->handle($user, $input);
        } catch (InvalidArgumentException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        } catch (UserAlreadyExistsException $e) {
            return $this->json(['error' => $e->getMessage()], Response::HTTP_CONFLICT);
        }

        return $this->json($profile->toArray(), Response::HTTP_OK);
    }
}
