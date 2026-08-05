'use client';

import { useEffect } from 'react';

export default function ConsoleGuard() {
  useEffect(() => {
    const shouldDisable =
      process.env.NEXT_PUBLIC_DISABLE_CONSOLE_LOGS === 'true' || process.env.NODE_ENV === 'production';

    if (shouldDisable) {
      console.log = () => {};
      console.info = () => {};
      console.debug = () => {};
    }
  }, []);

  return null;
}
