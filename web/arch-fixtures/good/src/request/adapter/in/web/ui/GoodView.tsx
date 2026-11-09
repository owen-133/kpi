// Fixture: compliant ui file imports react, tanstack, pdf-lib, css, domain and another ui folder only.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useQuery } from '@tanstack/react-query';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { Good } from '../../../../domain/Good.ts';
import { sharedPart } from '../../../../../shared/adapter/in/web/ui/SharedPart.tsx';
import './good.css';

export const goodView = [useState, createRoot, useQuery, PDFDocument, fontkit, Good, sharedPart];
