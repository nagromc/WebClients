/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import { type FC } from 'react';

import { Logo } from '@proton/components/components';
import { getAppName } from '@proton/shared/lib/apps/helper';
import { APPS } from '@proton/shared/lib/constants';

import './Sidebar.scss';

type Props = { expanded: boolean; onToggle: () => void };

export const Sidebar: FC<Props> = ({ children, expanded = false, onToggle }) => (
    <>
        <div
            id="pass-sidebar"
            className="sidebar flex flex-nowrap flex-column outline-none bg-strong"
            data-expanded={expanded}
        >
            <h1 className="sr-only">{getAppName(APPS.PROTONPASS)}</h1>
            <div className="w-full logo-container hidden md:flex shrink-0 justify-space-between items-center flex-nowrap">
                <Logo appName={APPS.PROTONPASS} />
            </div>

            <div className="mt-1 md:mt-0" aria-hidden="true" />
            <div className="flex-1 flex-nowrap flex flex-column overflow-overlay pb-2 md:mt-2" tabIndex={-1}>
                {children}
            </div>
        </div>

        {expanded && <div className="sidebar-backdrop" onClick={onToggle} /> /* FIXME: a11y for backdrop */}
    </>
);
