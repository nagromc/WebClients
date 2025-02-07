import { ComponentPropsWithoutRef, ReactNode, useMemo, useRef } from 'react';

import { c } from 'ttag';

import { getAppName } from '@proton/shared/lib/apps/helper';
import { APPS, APP_NAMES, SHARED_UPSELL_PATHS, UPSELL_COMPONENT } from '@proton/shared/lib/constants';
import { isElectronApp, isElectronOnMac, isElectronOnWindows } from '@proton/shared/lib/helpers/desktop';
import humanSize from '@proton/shared/lib/helpers/humanSize';
import { hasMailProfessional, hasNewVisionary, hasVisionary } from '@proton/shared/lib/helpers/subscription';
import { addUpsellPath, getUpsellRefFromApp } from '@proton/shared/lib/helpers/upsell';
import clsx from '@proton/utils/clsx';
import percentage from '@proton/utils/percentage';

import { UserDropdown, useActiveBreakpoint } from '../..';
import { useConfig, useSubscription, useUser } from '../../hooks';
import { useFocusTrap } from '../focus';
import { SettingsLink } from '../link';
import { getMeterColor } from '../progress';
import { Tooltip } from '../tooltip';
import Hamburger from './Hamburger';
import SidebarStorageMeter from './SidebarStorageMeter';

interface Props extends ComponentPropsWithoutRef<'div'> {
    app?: APP_NAMES;
    logo?: ReactNode;
    expanded?: boolean;
    onToggleExpand?: () => void;
    primary?: ReactNode;
    children?: ReactNode;
    version?: ReactNode;
    hasAppLinks?: boolean;
    appsDropdown: ReactNode;
    contactsButton?: ReactNode;
    /**
     * Extra content that will be rendered below the storage meter and version.
     */
    extraFooter?: ReactNode;
    /**
     * If `true`, the sidebar children container will grow to the maximum
     * available size.
     *
     * This is the default behavior, set this to `false` if you want the footer
     * to stick to the content.
     *
     * @default true
     */
    growContent?: boolean;
}

const Sidebar = ({
    app,
    expanded = false,
    appsDropdown,
    onToggleExpand,
    hasAppLinks = true,
    logo,
    primary,
    children,
    version,
    contactsButton,
    extraFooter,
    growContent = true,
    ...rest
}: Props) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const focusTrapProps = useFocusTrap({
        active: expanded,
        rootRef,
    });
    const { APP_NAME } = useConfig();
    const [user] = useUser();
    const [subscription] = useSubscription();
    const { UsedSpace, MaxSpace, isMember, isSubUser } = user;
    const spacePercentage = percentage(MaxSpace, UsedSpace);
    const spacePercentagePrecision = Math.ceil(spacePercentage * 10000) / 10000;
    const { viewportWidth } = useActiveBreakpoint();
    const isElectron = isElectronApp();
    const isElectronMac = isElectronOnMac();
    const isElectronWindows = isElectronOnWindows();

    const upsellRef = getUpsellRefFromApp({
        app: APP_NAME,
        feature: SHARED_UPSELL_PATHS.STORAGE,
        component: UPSELL_COMPONENT.BUTTON,
        fromApp: app,
    });

    const canAddStorage = useMemo(() => {
        if (!subscription) {
            return false;
        }
        if (isSubUser) {
            return false;
        }
        if (isMember) {
            return false;
        }
        if (hasNewVisionary(subscription) || hasVisionary(subscription) || hasMailProfessional(subscription)) {
            return false;
        }
        return true;
    }, [subscription, user]);

    const storageText = (
        <>
            <span
                className={clsx(['used-space text-bold', `color-${getMeterColor(spacePercentagePrecision)}`])}
                style={{ '--signal-success': 'initial' }}
                // Used by Drive E2E tests
                data-testid="app-used-space"
            >
                {humanSize(UsedSpace)}
            </span>
            &nbsp;/&nbsp;<span className="max-space">{humanSize(MaxSpace)}</span>
        </>
    );

    return (
        <>
            <div
                ref={rootRef}
                className={clsx('sidebar flex flex-nowrap flex-column no-print outline-none', isElectron && 'mt-2')}
                data-expanded={expanded}
                {...rest}
                {...focusTrapProps}
            >
                <Hamburger
                    expanded={expanded}
                    onToggle={onToggleExpand}
                    className="md:hidden shrink-0 absolute right-0 mr-5 mt-2 opacity-0 focus:opacity-100 bg-norm"
                />

                <h1 className="sr-only">{getAppName(APP_NAME)}</h1>

                {!isElectron && (
                    <div className="logo-container hidden md:flex shrink-0 justify-space-between items-center flex-nowrap">
                        {logo}
                        <div className="hidden md:block">{appsDropdown}</div>
                    </div>
                )}

                {isElectronMac && (
                    <div className="flex flex-column">
                        <div className="ml-auto mr-3 mb-1">{appsDropdown}</div>
                        {primary && <div className="px-3 pb-2 pt-1">{primary}</div>}
                    </div>
                )}

                {isElectronWindows && (
                    <div className="flex gap-4 justify-between items-center flex-nowrap px-3 pb-2 pt-1">
                        {primary && <div className="shrink-0 flex-1 hidden md:block">{primary}</div>}
                        <div className="shrink-0">{appsDropdown}</div>
                    </div>
                )}

                {viewportWidth['<=small'] && (
                    <div className="px-3 shrink-0 md:hidden">
                        <UserDropdown app={APP_NAME} hasAppLinks={hasAppLinks} />
                    </div>
                )}

                {primary && !isElectronMac && !isElectronWindows ? (
                    <div className="px-3 pb-2 shrink-0 hidden md:block">{primary}</div>
                ) : null}
                <div className="mt-1 md:mt-0" aria-hidden="true" />
                <div
                    className={clsx(
                        growContent ? 'flex-1' : 'grow-0',
                        'flex-nowrap flex flex-column overflow-overlay pb-2 md:mt-2'
                    )}
                    tabIndex={-1}
                >
                    {contactsButton}
                    {children}
                </div>
                {APP_NAME !== APPS.PROTONVPN_SETTINGS && MaxSpace > 0 ? (
                    <div className="shrink-0 app-infos px-3 mt-2">
                        <SidebarStorageMeter
                            label={`${c('Storage').t`Your current storage:`} ${humanSize(UsedSpace)} / ${humanSize(
                                MaxSpace
                            )}`}
                            value={spacePercentagePrecision}
                        />
                        <div className="flex flex-nowrap justify-space-between py-2">
                            <span>
                                {canAddStorage ? (
                                    <Tooltip title={c('Storage').t`Upgrade storage`}>
                                        <SettingsLink
                                            path={addUpsellPath('/upgrade', upsellRef)}
                                            className="app-infos-storage text-no-decoration text-xs m-0"
                                        >
                                            {storageText}
                                        </SettingsLink>
                                    </Tooltip>
                                ) : (
                                    <span className="app-infos-storage text-xs m-0">{storageText}</span>
                                )}
                            </span>

                            <span className="app-infos-compact">{version}</span>
                        </div>
                        {extraFooter}
                    </div>
                ) : (
                    <div className="border-top">
                        <div className="text-center py-2 px-3">{version}</div>
                    </div>
                )}
            </div>
            {expanded ? <div className="sidebar-backdrop" onClick={onToggleExpand}></div> : undefined}
        </>
    );
};

export default Sidebar;
