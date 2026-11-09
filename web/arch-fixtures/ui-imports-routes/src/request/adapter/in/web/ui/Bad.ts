// Fixture: UI rule violation, a ui file imports routes.ts and next/server.
import { routes } from '../routes.ts';
import { NextResponse } from 'next/server';

export const bad = [routes, NextResponse];
