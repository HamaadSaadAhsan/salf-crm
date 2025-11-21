import { lazy, Suspense } from 'react';
import { usePage } from '@inertiajs/react';
import { ScreenLoader } from '@/components/screen-loader';

const LazyCrmModule = lazy(() => import('@/crm'));
const LazyStoreInventoryModule = lazy(() => import('@/store-inventory'));
const LazyMailModule = lazy(() => import('@/mail'));

export function ModulesProvider() {
  const { url } = usePage();
  const path = location.pathname;

  // Detect if current path is for CRM or Store
  const isCrm = path.startsWith('/crm');
  const isMail = path.startsWith('/mail');
  const isStoreInventory = path.startsWith('/store-inventory');

  if (isCrm) {
    return (
      <Routes>
        <Route
          path="/crm/*"
          element={
            <Suspense fallback={<ScreenLoader />}>
              <LazyCrmModule />
            </Suspense>
          }
        />
      </Routes>
    );
  } else if (isStoreInventory) {
    return (
      <Routes>
        <Route
          path="/store-inventory/*"
          element={
            <Suspense fallback={<ScreenLoader />}>
              <LazyStoreInventoryModule />
            </Suspense>
          }
        />
      </Routes>
    );
  } else if (isMail) {
    return (
      <Routes>
        <Route path="/mail/*" element={<LazyMailModule />} />
      </Routes>
    );
  }
}
