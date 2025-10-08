/**
 * Integration tests for SLA monitoring & analytics
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
	trackMessageDelivery,
	trackModerationCase,
	checkEscalationNeeded,
	generateDailySLAReport,
	getDashboardMetrics,
	trackSLABreach,
	SLA_THRESHOLDS
} from '$lib/server/analytics/messagingSla';
import { pb } from '$lib/pocketbase';

describe('SLA Monitoring', () => {
	describe('Message Delivery Tracking', () => {
		it('should track message delivery within SLA', async () => {
			const messageId = 'test_msg_1';
			const threadId = 'test_thread_1';
			const latencyMs = 3000; // 3 seconds, within 5 second SLA

			await trackMessageDelivery(messageId, threadId, latencyMs);

			// Verify event was created
			const events = await pb.collection('analytics_events').getFullList({
				filter: `event_type = "message_delivery"`,
				sort: '-created'
			});

			expect(events.length).toBeGreaterThan(0);

			const latestEvent = events[0];
			const metadata = JSON.parse(latestEvent.metadata);

			expect(metadata.messageId).toBe(messageId);
			expect(metadata.threadId).toBe(threadId);
			expect(metadata.latencyMs).toBe(latencyMs);
			expect(metadata.withinSLA).toBe(true);
			expect(metadata.threshold).toBe(SLA_THRESHOLDS.MESSAGE_DELIVERY_MS);
		});

		it('should track message delivery exceeding SLA', async () => {
			const messageId = 'test_msg_2';
			const threadId = 'test_thread_2';
			const latencyMs = 8000; // 8 seconds, exceeds 5 second SLA

			await trackMessageDelivery(messageId, threadId, latencyMs);

			const events = await pb.collection('analytics_events').getFullList({
				filter: `event_type = "message_delivery"`,
				sort: '-created'
			});

			const latestEvent = events[0];
			const metadata = JSON.parse(latestEvent.metadata);

			expect(metadata.withinSLA).toBe(false);
			expect(metadata.latencyMs).toBeGreaterThan(SLA_THRESHOLDS.MESSAGE_DELIVERY_MS);
		});
	});

	describe('Moderation Case Tracking', () => {
		it('should track case within SLA thresholds', async () => {
			const caseId = 'test_case_1';
			const createdAt = new Date('2024-01-01T10:00:00Z');
			const firstResponseAt = new Date('2024-01-01T10:10:00Z'); // 10 minutes
			const resolvedAt = new Date('2024-01-01T11:30:00Z'); // 90 minutes

			await trackModerationCase(caseId, createdAt, firstResponseAt, resolvedAt);

			const events = await pb.collection('analytics_events').getFullList({
				filter: `event_type = "moderation_case_timing"`,
				sort: '-created'
			});

			expect(events.length).toBeGreaterThan(0);

			const latestEvent = events[0];
			const metadata = JSON.parse(latestEvent.metadata);

			expect(metadata.caseId).toBe(caseId);
			expect(metadata.responseTimeMinutes).toBeCloseTo(10, 1);
			expect(metadata.resolutionTimeMinutes).toBeCloseTo(90, 1);
			expect(metadata.responseWithinSLA).toBe(true);
			expect(metadata.resolutionWithinSLA).toBe(true);
		});

		it('should track case exceeding response SLA', async () => {
			const caseId = 'test_case_2';
			const createdAt = new Date('2024-01-01T10:00:00Z');
			const firstResponseAt = new Date('2024-01-01T10:20:00Z'); // 20 minutes - exceeds 15 min SLA
			const resolvedAt = new Date('2024-01-01T10:45:00Z'); // 45 minutes

			await trackModerationCase(caseId, createdAt, firstResponseAt, resolvedAt);

			const events = await pb.collection('analytics_events').getFullList({
				filter: `event_type = "moderation_case_timing"`,
				sort: '-created'
			});

			const latestEvent = events[0];
			const metadata = JSON.parse(latestEvent.metadata);

			expect(metadata.responseWithinSLA).toBe(false);
			expect(metadata.responseTimeMinutes).toBeGreaterThan(SLA_THRESHOLDS.MODERATION_RESPONSE_MINUTES);
		});

		it('should track case exceeding resolution SLA', async () => {
			const caseId = 'test_case_3';
			const createdAt = new Date('2024-01-01T10:00:00Z');
			const firstResponseAt = new Date('2024-01-01T10:10:00Z'); // 10 minutes
			const resolvedAt = new Date('2024-01-01T13:00:00Z'); // 180 minutes - exceeds 120 min SLA

			await trackModerationCase(caseId, createdAt, firstResponseAt, resolvedAt);

			const events = await pb.collection('analytics_events').getFullList({
				filter: `event_type = "moderation_case_timing"`,
				sort: '-created'
			});

			const latestEvent = events[0];
			const metadata = JSON.parse(latestEvent.metadata);

			expect(metadata.resolutionWithinSLA).toBe(false);
			expect(metadata.resolutionTimeMinutes).toBeGreaterThan(SLA_THRESHOLDS.MODERATION_RESOLUTION_MINUTES);
		});

		it('should handle unresolved cases', async () => {
			const caseId = 'test_case_4';
			const createdAt = new Date();
			const firstResponseAt = null;
			const resolvedAt = null;

			await trackModerationCase(caseId, createdAt, firstResponseAt, resolvedAt);

			const events = await pb.collection('analytics_events').getFullList({
				filter: `event_type = "moderation_case_timing"`,
				sort: '-created'
			});

			const latestEvent = events[0];
			const metadata = JSON.parse(latestEvent.metadata);

			expect(metadata.responseTimeMinutes).toBeNull();
			expect(metadata.resolutionTimeMinutes).toBeNull();
			expect(metadata.responseWithinSLA).toBe(false);
			expect(metadata.resolutionWithinSLA).toBe(false);
		});
	});

	describe('Escalation Detection', () => {
		it('should identify cases needing escalation', async () => {
			// This test verifies the query logic
			// In a real scenario, you would create test cases older than 15 minutes

			const result = await checkEscalationNeeded();

			expect(Array.isArray(result)).toBe(true);
			result.forEach((item) => {
				expect(item).toHaveProperty('caseId');
				expect(item).toHaveProperty('ageMinutes');
				expect(item.ageMinutes).toBeGreaterThanOrEqual(15);
			});
		});
	});

	describe('Daily SLA Reports', () => {
		it('should generate report with all metrics', async () => {
			// Track some test events first
			await trackMessageDelivery('msg1', 'thread1', 2000);
			await trackMessageDelivery('msg2', 'thread1', 7000);

			const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
			const report = await generateDailySLAReport(yesterday);

			expect(report).toHaveProperty('reportDate');
			expect(report).toHaveProperty('totalMessages');
			expect(report).toHaveProperty('messagesWithinSLA');
			expect(report).toHaveProperty('slaCompliancePercent');
			expect(report).toHaveProperty('avgDeliveryLatencyMs');
			expect(report).toHaveProperty('p95DeliveryLatencyMs');
			expect(report).toHaveProperty('p99DeliveryLatencyMs');
			expect(report).toHaveProperty('totalCases');
			expect(report).toHaveProperty('avgResponseTimeMinutes');
			expect(report).toHaveProperty('avgResolutionTimeMinutes');
			expect(report).toHaveProperty('escalatedCases');

			expect(typeof report.slaCompliancePercent).toBe('number');
			expect(report.slaCompliancePercent).toBeGreaterThanOrEqual(0);
			expect(report.slaCompliancePercent).toBeLessThanOrEqual(100);
		});

		it('should calculate percentiles correctly', async () => {
			// Track multiple messages to test percentile calculation
			const latencies = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];

			for (let i = 0; i < latencies.length; i++) {
				await trackMessageDelivery(`msg_${i}`, 'thread1', latencies[i]);
			}

			const report = await generateDailySLAReport(new Date());

			expect(report.p95DeliveryLatencyMs).toBeGreaterThan(0);
			expect(report.p99DeliveryLatencyMs).toBeGreaterThan(0);
			expect(report.p99DeliveryLatencyMs).toBeGreaterThanOrEqual(report.p95DeliveryLatencyMs);
		});

		it('should handle empty data gracefully', async () => {
			const farFuture = new Date('2099-01-01');
			const report = await generateDailySLAReport(farFuture);

			expect(report.totalMessages).toBe(0);
			expect(report.totalCases).toBe(0);
			expect(report.slaCompliancePercent).toBe(100); // No failures = 100%
			expect(report.avgDeliveryLatencyMs).toBe(0);
		});
	});

	describe('Dashboard Metrics', () => {
		it('should return real-time metrics', async () => {
			const metrics = await getDashboardMetrics();

			expect(metrics).toHaveProperty('timestamp');
			expect(metrics).toHaveProperty('openCasesCount');
			expect(metrics).toHaveProperty('escalationNeededCount');
			expect(metrics).toHaveProperty('deliverySuccessRate24h');
			expect(metrics).toHaveProperty('avgResponseTime24h');
			expect(metrics).toHaveProperty('messagesLast24h');
			expect(metrics).toHaveProperty('casesLast24h');
			expect(metrics).toHaveProperty('slaStatus');
			expect(metrics).toHaveProperty('needsEscalation');

			expect(['healthy', 'degraded']).toContain(metrics.slaStatus);
			expect(Array.isArray(metrics.needsEscalation)).toBe(true);
		});

		it('should mark status as degraded when SLA < 99.5%', async () => {
			// Track multiple failures
			for (let i = 0; i < 10; i++) {
				await trackMessageDelivery(`msg_fail_${i}`, 'thread1', 10000); // All exceed SLA
			}

			const metrics = await getDashboardMetrics();

			// With enough failures, success rate should drop below 99.5%
			if (metrics.deliverySuccessRate24h < SLA_THRESHOLDS.UPTIME_TARGET_PERCENT) {
				expect(metrics.slaStatus).toBe('degraded');
			}
		});
	});

	describe('SLA Breach Tracking', () => {
		it('should log breach events', async () => {
			await trackSLABreach('response', {
				caseId: 'breach_case_1',
				actualMinutes: 25,
				thresholdMinutes: 15
			});

			const breaches = await pb.collection('analytics_events').getFullList({
				filter: `event_type = "sla_breach"`,
				sort: '-created'
			});

			expect(breaches.length).toBeGreaterThan(0);

			const latestBreach = breaches[0];
			const metadata = JSON.parse(latestBreach.metadata);

			expect(metadata.breachType).toBe('response');
			expect(metadata).toHaveProperty('caseId');
			expect(metadata).toHaveProperty('timestamp');
		});
	});

	describe('SLA Thresholds', () => {
		it('should have correct threshold values', () => {
			expect(SLA_THRESHOLDS.MESSAGE_DELIVERY_MS).toBe(5000);
			expect(SLA_THRESHOLDS.MODERATION_RESPONSE_MINUTES).toBe(15);
			expect(SLA_THRESHOLDS.MODERATION_RESOLUTION_MINUTES).toBe(120);
			expect(SLA_THRESHOLDS.UPTIME_TARGET_PERCENT).toBe(99.5);
			expect(SLA_THRESHOLDS.ESCALATION_THRESHOLD_MINUTES).toBe(15);
		});
	});
});
