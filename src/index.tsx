import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createHashRouter } from 'react-router-dom';

import './index.scss';
import Layout from './components/Layout';
import SuspenseFallback from './components/SuspenseFallback';
import ErrorBoundary from './components/ErrorBoundary';

const element = document.getElementById('root');

if (element) {
  const root = createRoot(element);
  const router = createHashRouter([
    {
      path: '/',
      element: <Layout />,
      errorElement: <ErrorBoundary />,
      children: [
        {
          index: true,
          lazy: () => import(`./pages/index`)
        },
        {
          path: '/play',
          lazy: () => import(`./pages/play`)
        }
      ]
    }
  ]);

  root.render(
    <Suspense fallback={<SuspenseFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
