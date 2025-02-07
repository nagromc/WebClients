import { type VFC, useEffect } from 'react';
import { Route } from 'react-router-dom';

import { usePopupStateEffects } from 'proton-pass-extension/lib/hooks/usePopupStateEffects';

import { useNotifications } from '@proton/components/hooks';
import { InviteProvider } from '@proton/pass/components/Invite/InviteProvider';
import { ItemsProvider } from '@proton/pass/components/Item/Context/ItemsProvider';
import { ItemsList } from '@proton/pass/components/Item/List/ItemsList';
import { Content } from '@proton/pass/components/Layout/Section/Content';
import { SubSidebar } from '@proton/pass/components/Layout/Section/SubSidebar';
import { ItemSwitch } from '@proton/pass/components/Navigation/ItemSwitch';
import { PasswordProvider } from '@proton/pass/components/Password/PasswordProvider';
import { SpotlightProvider } from '@proton/pass/components/Spotlight/SpotlightProvider';

import { Header } from './Header/Header';

import './Main.scss';

export const Main: VFC = () => {
    usePopupStateEffects();

    /** clear notifications when `Main` unmounts */
    const { clearNotifications } = useNotifications();
    useEffect(() => () => clearNotifications(), []);

    return (
        <ItemsProvider>
            <InviteProvider>
                <PasswordProvider>
                    <SpotlightProvider>
                        <main
                            key="main"
                            id="main"
                            className="flex flex-column flex-nowrap w-full h-full overflow-hidden anime-fade-in"
                            style={{ '--anime-delay': '50ms' }}
                        >
                            <Header />
                            <div
                                id="pass-layout"
                                className="flex items-center justify-center flex-nowrap w-full h-full"
                            >
                                <SubSidebar>
                                    <ItemsList />
                                </SubSidebar>
                                <Content>
                                    <Route component={ItemSwitch} />
                                </Content>
                            </div>
                        </main>
                    </SpotlightProvider>
                </PasswordProvider>
            </InviteProvider>
        </ItemsProvider>
    );
};
