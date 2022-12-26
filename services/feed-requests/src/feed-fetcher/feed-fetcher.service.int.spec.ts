/* eslint-disable max-len */
import { INestApplication } from '@nestjs/common';
import { RequestStatus } from './constants';
import { FeedFetcherService } from './feed-fetcher.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  clearDatabase,
  setupPostgresTests,
  teardownPostgresTests,
} from '../shared/utils/setup-postgres-tests';
import { Request, Response } from './entities';
import { EntityRepository } from '@mikro-orm/postgresql';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import dayjs from 'dayjs';

jest.mock('../utils/logger');

describe('FeedFetcherService (Integration)', () => {
  let app: INestApplication;
  let service: FeedFetcherService;
  const url = 'https://rss-feed.com/feed.xml';
  let requestRepo: EntityRepository<Request>;
  const failedDurationThresholdHours = 36;

  beforeAll(async () => {
    const setupData = await setupPostgresTests(
      {
        providers: [
          FeedFetcherService,
          {
            provide: AmqpConnection,
            useValue: {
              publish: jest.fn(),
            },
          },
        ],
      },
      {
        models: [Request, Response],
      },
    );

    const { module } = await setupData.init();

    app = module.createNestApplication();
    await app.init();

    service = app.get(FeedFetcherService);
    service.failedDurationThresholdHours = failedDurationThresholdHours;
    requestRepo = app.get<EntityRepository<Request>>(
      getRepositoryToken(Request),
    );
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await teardownPostgresTests();
  });

  describe('requestExistsAfterTime', () => {
    it('should return true if a request exists after the given time', async () => {
      const req = new Request();
      req.status = RequestStatus.FAILED;
      req.url = url;
      req.createdAt = new Date(2020, 1, 6);

      await requestRepo.persistAndFlush(req);

      await expect(
        service.requestExistsAfterTime(
          {
            url,
          },
          new Date(2019, 1, 1),
        ),
      ).resolves.toEqual(true);
    });

    it('should return true if no request exists after the given time', async () => {
      const req = new Request();
      req.status = RequestStatus.FAILED;
      req.url = url;
      req.createdAt = new Date(2020, 1, 6);

      await requestRepo.persistAndFlush(req);

      await expect(
        service.requestExistsAfterTime(
          {
            url,
          },
          new Date(2021, 1, 1),
        ),
      ).resolves.toEqual(false);
    });
  });

  describe('getEarliestFailedAttempt', () => {
    it('returns the earliest failed attempt if there were no previous ok attempts', async () => {
      const req1 = new Request();
      req1.status = RequestStatus.FAILED;
      req1.url = url;
      req1.createdAt = new Date(2020, 1, 6);
      const req2 = new Request();
      req2.status = RequestStatus.FAILED;
      req2.url = url;
      req2.createdAt = new Date(2020, 1, 5);
      const req3 = new Request();
      req3.status = RequestStatus.FAILED;
      req3.url = url;
      req3.createdAt = new Date(2020, 1, 4);
      const req4 = new Request();
      req4.status = RequestStatus.FAILED;
      req4.url = 'fake-url';
      req4.createdAt = new Date(2020, 1, 1);

      await requestRepo.persistAndFlush([req1, req2, req3, req4]);

      const earliestFailedAttempt = await service.getEarliestFailedAttempt(url);

      expect(earliestFailedAttempt?.id).toEqual(req3.id);
    });
    it('returns the first failed attempt after the latest success', async () => {
      const irrelevantUrl = 'https://irrelevant.com/feed.xml';

      const req1 = new Request();
      req1.status = RequestStatus.FAILED;
      req1.url = url;
      req1.createdAt = new Date(2020, 1, 6);

      const req2 = new Request();
      req2.status = RequestStatus.FAILED;
      req2.url = url;
      req2.createdAt = new Date(2020, 1, 5);

      const req3 = new Request();
      req3.status = RequestStatus.FAILED;
      req3.url = url;
      req3.createdAt = new Date(2020, 1, 4);

      const req4 = new Request();
      req4.status = RequestStatus.FAILED;
      req4.url = irrelevantUrl;
      req4.createdAt = new Date(2020, 1, 4);

      const req5 = new Request();
      req5.status = RequestStatus.OK;
      req5.url = url;
      req5.createdAt = new Date(2020, 1, 3);

      const req6 = new Request();
      req6.status = RequestStatus.OK;
      req6.url = irrelevantUrl;
      req6.createdAt = new Date(2020, 1, 5);

      await requestRepo.persistAndFlush([req1, req2, req3, req4, req5, req6]);

      const foundAttempt = await service.getEarliestFailedAttempt(url);

      expect(foundAttempt?.id).toEqual(req3.id);
    });
  });

  describe('getLatestRequest', () => {
    it('returns the request with the response', async () => {
      const req1 = new Request();
      req1.status = RequestStatus.FAILED;
      req1.url = url;
      req1.createdAt = new Date(2020, 1, 6);

      const response = new Response();
      response.statusCode = 200;
      response.text = 'text';
      response.isCloudflare = false;

      req1.response = response;

      await requestRepo.persistAndFlush([req1]);

      const latestRequest = await service.getLatestRequest(url);

      expect(latestRequest?.id).toEqual(req1.id);
      expect(latestRequest?.response).toMatchObject({
        statusCode: 200,
        text: 'text',
        isCloudflare: false,
      });
    });
  });

  describe('isPastFailureThreshold', () => {
    it('returns false if the latest request is OK', async () => {
      const req1 = new Request();
      req1.status = RequestStatus.OK;
      req1.url = url;
      req1.createdAt = new Date(2020, 1, 6);

      await requestRepo.persistAndFlush([req1]);

      const isPastFailureThreshold = await service.isPastFailureThreshold(url);

      expect(isPastFailureThreshold).toEqual(false);
    });

    it('returns false if there is no latest request', async () => {
      const isPastFailureThreshold = await service.isPastFailureThreshold(url);

      expect(isPastFailureThreshold).toEqual(false);
    });

    it('returns false if the latest request is failed but the earliest failed attempt is not past the threshold', async () => {
      const latestOkAttempt = new Date(2020, 1, 3);

      const req2 = new Request();
      req2.status = RequestStatus.FAILED;
      req2.url = url;
      req2.createdAt = dayjs()
        .subtract(failedDurationThresholdHours - 2, 'hour')
        .toDate();

      const req3 = new Request();
      req3.status = RequestStatus.FAILED;
      req3.url = url;
      req3.createdAt = dayjs()
        .subtract(failedDurationThresholdHours - 1, 'hour')
        .toDate();

      const req4 = new Request();
      req4.status = RequestStatus.OK;
      req4.url = url;
      req4.createdAt = latestOkAttempt;

      await requestRepo.persistAndFlush([req2, req3, req4]);

      const isPastFailureThreshold = await service.isPastFailureThreshold(url);

      expect(isPastFailureThreshold).toEqual(false);
    });

    it('returns true if the earliest failed attempt after the latest OK attempt passes the threshold', async () => {
      const latestOkAttempt = new Date(2020, 1, 3);

      const req2 = new Request();
      req2.status = RequestStatus.FAILED;
      req2.url = url;
      req2.createdAt = dayjs()
        .subtract(failedDurationThresholdHours, 'hour')
        .toDate();

      const req3 = new Request();
      req3.status = RequestStatus.FAILED;
      req3.url = url;
      req3.createdAt = dayjs()
        .subtract(failedDurationThresholdHours + 1, 'hour')
        .toDate();

      const req4 = new Request();
      req4.status = RequestStatus.OK;
      req4.url = url;
      req4.createdAt = latestOkAttempt;

      await requestRepo.persistAndFlush([req2, req3, req4]);

      const isPastFailureThreshold = await service.isPastFailureThreshold(url);

      expect(isPastFailureThreshold).toEqual(true);
    });

    it('returns false if there are no OK attempts and the earliest failed attempt is not past threshold', async () => {
      const req3 = new Request();
      req3.status = RequestStatus.FAILED;
      req3.url = url;
      req3.createdAt = dayjs()
        .subtract(failedDurationThresholdHours - 2, 'hour')
        .toDate();

      const req4 = new Request();
      req4.status = RequestStatus.FETCH_ERROR;
      req4.url = url;
      req4.createdAt = dayjs()
        .subtract(failedDurationThresholdHours - 1, 'hour')
        .toDate();

      await requestRepo.persistAndFlush([req3, req4]);

      const isPastFailureThreshold = await service.isPastFailureThreshold(url);

      expect(isPastFailureThreshold).toEqual(false);
    });

    it('returns true if there are no OK attempts and the earliest failed attempt is past threshold', async () => {
      const req3 = new Request();
      req3.status = RequestStatus.FAILED;
      req3.url = url;
      req3.createdAt = dayjs()
        .subtract(failedDurationThresholdHours - 1, 'hour')
        .toDate();

      const req4 = new Request();
      req4.status = RequestStatus.FETCH_ERROR;
      req4.url = url;
      req4.createdAt = dayjs()
        .subtract(failedDurationThresholdHours + 1, 'hour')
        .toDate();

      await requestRepo.persistAndFlush([req3, req4]);

      const isPastFailureThreshold = await service.isPastFailureThreshold(url);

      expect(isPastFailureThreshold).toEqual(true);
    });
  });
});