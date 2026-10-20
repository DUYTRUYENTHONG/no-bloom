"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getPageViewTracker } from '@/lib/analytics/tracker';
import { getTrafficTracker } from '@/lib/traffic/client';
/** Route completion informs a page-instance tracker that survives React remounts. */
export function TrafficObserver() {
    const pathname = usePathname();
    useEffect(() => { if (process.env.NEXT_PUBLIC_COUNTER_ENABLED !== 'true')
        return; const traffic = getTrafficTracker(), preferences = getPageViewTracker(); if (!traffic || !preferences)
        return; traffic.navigate(pathname); traffic.mount(); const unsubscribe = preferences.subscribe(choice => traffic.setConsent(choice)); return () => { unsubscribe(); traffic.unmount(); }; }, [pathname]);
    return null;
}
