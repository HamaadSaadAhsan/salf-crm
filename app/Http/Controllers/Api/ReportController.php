<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReportFilterRequest;
use App\Services\CacheService;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;

class ReportController extends Controller
{
    protected const CACHE_TTL = 3600;

    public function __construct(
        protected ReportService $reportService
    ) {}

    public function leadsOverall(ReportFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $user = $request->user();
        $cacheKey = ReportService::cacheKey('leads-overall', $user->id, $filters);

        $data = CacheService::remember($cacheKey, function () use ($filters, $user) {
            return $this->reportService->leadsOverall($filters, $user);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function leadsByOffice(ReportFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $user = $request->user();
        $cacheKey = ReportService::cacheKey('leads-by-office', $user->id, $filters);

        $data = CacheService::remember($cacheKey, function () use ($filters, $user) {
            return $this->reportService->leadsByOffice($filters, $user);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function leadsBySupportAgent(ReportFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $user = $request->user();
        $cacheKey = ReportService::cacheKey('leads-by-support-agent', $user->id, $filters);

        $data = CacheService::remember($cacheKey, function () use ($filters, $user) {
            return $this->reportService->leadsBySupportAgent($filters, $user);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function leadsBySalesRep(ReportFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $user = $request->user();
        $cacheKey = ReportService::cacheKey('leads-by-sales-rep', $user->id, $filters);

        $data = CacheService::remember($cacheKey, function () use ($filters, $user) {
            return $this->reportService->leadsBySalesRep($filters, $user);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function leadsBySource(ReportFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $user = $request->user();
        $cacheKey = ReportService::cacheKey('leads-by-source', $user->id, $filters);

        $data = CacheService::remember($cacheKey, function () use ($filters, $user) {
            return $this->reportService->leadsBySource($filters, $user);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function leadsByService(ReportFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $user = $request->user();
        $cacheKey = ReportService::cacheKey('leads-by-service', $user->id, $filters);

        $data = CacheService::remember($cacheKey, function () use ($filters, $user) {
            return $this->reportService->leadsByService($filters, $user);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function leadsConversion(ReportFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $user = $request->user();
        $cacheKey = ReportService::cacheKey('leads-conversion', $user->id, $filters);

        $data = CacheService::remember($cacheKey, function () use ($filters, $user) {
            return $this->reportService->leadsConversion($filters, $user);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function leadsLost(ReportFilterRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $user = $request->user();
        $cacheKey = ReportService::cacheKey('leads-lost', $user->id, $filters);

        $data = CacheService::remember($cacheKey, function () use ($filters, $user) {
            return $this->reportService->leadsLost($filters, $user);
        }, self::CACHE_TTL);

        return response()->json($data);
    }
}
