// app/docs/swagger-component.tsx
'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function DynamicSwaggerUI({ url }: { url: string }) {
  return <SwaggerUI url={url} />;
}