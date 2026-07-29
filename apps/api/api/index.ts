import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import express from 'express';
import { AppModule } from '../src/app.module';

/**
 * Vercel serverless entrypoint for apps/api.
 *
 * apps/api's documented deployment target is a persistent container
 * (Fly.io/Render — docs/Architecture.md §11), where `src/main.ts`'s
 * `app.listen()` is the real entrypoint. This file exists only so the app
 * doesn't hard-crash if/while it's also pointed at Vercel: Vercel Serverless
 * Functions must export a request handler, not call `.listen()`, and the
 * Nest app instance is cached across warm invocations of the same instance
 * to avoid re-bootstrapping Nest on every request.
 */
const expressApp = express();
let bootstrapped: Promise<void> | null = null;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  await app.init();
}

export default async function handler(req: Request, res: Response) {
  if (!bootstrapped) {
    bootstrapped = bootstrap();
  }
  await bootstrapped;
  expressApp(req, res);
}
