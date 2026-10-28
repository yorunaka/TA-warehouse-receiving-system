// app/api/docs/spec/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'docs/', 'openapi.yaml');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const parsedYaml = yaml.parse(fileContents);

    return NextResponse.json(parsedYaml);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read OpenAPI spec';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}