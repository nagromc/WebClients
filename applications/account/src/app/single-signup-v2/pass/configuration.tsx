import { c } from 'ttag';

import { PassLogo } from '@proton/components/components';
import {
    get2FAAuthenticator,
    getCreditCards,
    getDevices,
    getHideMyEmailAliases,
    getItems,
    getLoginsAndNotes,
    getVaultSharing,
} from '@proton/components/containers/payments/features/pass';
import { PlanCardFeatureList } from '@proton/components/containers/payments/subscription/PlanCardFeatures';
import { APPS, CYCLE, PASS_APP_NAME, PASS_SHORT_APP_NAME, PLANS } from '@proton/shared/lib/constants';
import { VPNServersCountData } from '@proton/shared/lib/interfaces';
import isTruthy from '@proton/utils/isTruthy';
import noop from '@proton/utils/noop';

import { SignupType } from '../../signup/interfaces';
import Benefits, { BenefitItem } from '../Benefits';
import BundlePlanSubSection from '../BundlePlanSubSection';
import { PlanCard, planCardFeatureProps } from '../PlanCardSelector';
import { getBenefits, getGenericBenefits, getGenericFeatures, getJoinString } from '../configuration/helper';
import { SignupConfiguration, SignupMode } from '../interface';
import CustomStep from './CustomStep';
import { getInfo } from './InstallExtensionStep';
import setupPass from './onboarding.svg';
import recoveryKit from './recovery-kit.svg';

export const getPassBenefits = (): BenefitItem[] => {
    return [
        {
            key: 1,
            text: c('pass_signup_2023: Info').t`Hide-my-email aliases protect your email from data breaches`,
            icon: {
                name: 'alias',
            },
        },
        {
            key: 2,
            text: c('pass_signup_2023: Info').t`End-to-end encrypted notes`,
            icon: {
                name: 'lock',
            },
        },
        ...getGenericBenefits(),
    ];
};

export const getFreePassFeatures = (passVaultSharingEnabled: boolean) => {
    return [
        getLoginsAndNotes(),
        getDevices(),
        getHideMyEmailAliases(10),
        passVaultSharingEnabled && getVaultSharing(3),
    ].filter(isTruthy);
};

export const getCustomPassFeatures = (passVaultSharingEnabled: boolean) => {
    return [
        getLoginsAndNotes(),
        getDevices(),
        getHideMyEmailAliases('unlimited'),
        get2FAAuthenticator(true),
        getItems(),
        getCreditCards(),
        passVaultSharingEnabled && getVaultSharing(10),
    ].filter(isTruthy);
};

export const getPassConfiguration = ({
    mode,
    hideFreePlan,
    isDesktop,
    isPassWelcome,
    passVaultSharingEnabled,
    vpnServersCountData,
}: {
    mode: SignupMode;
    hideFreePlan: boolean;
    isDesktop: boolean;
    isPassWelcome: boolean;
    passVaultSharingEnabled: boolean;
    vpnServersCountData: VPNServersCountData;
}): SignupConfiguration => {
    const logo = <PassLogo />;

    const title = c('pass_signup_2023: Info').t`Encrypted password manager that also protects your identity`;
    const inviteTitle = c('pass_signup_2023: Info').t`You have been invited to join ${PASS_APP_NAME}`;
    const onboardingTitle = c('pass_signup_2023: Info').t`Unlock ${PASS_APP_NAME} premium features by upgrading`;

    const features = getGenericFeatures(isDesktop);

    const planCards: PlanCard[] = [
        !hideFreePlan && {
            plan: PLANS.FREE,
            subsection: (
                <PlanCardFeatureList
                    {...planCardFeatureProps}
                    features={getFreePassFeatures(passVaultSharingEnabled)}
                />
            ),
            type: 'standard' as const,
            guarantee: false,
        },
        {
            plan: PLANS.PASS_PLUS,
            subsection: (
                <PlanCardFeatureList
                    {...planCardFeatureProps}
                    features={getCustomPassFeatures(passVaultSharingEnabled)}
                />
            ),
            type: 'best' as const,
            guarantee: true,
        },
        !isPassWelcome && {
            plan: PLANS.BUNDLE,
            subsection: <BundlePlanSubSection vpnServersCountData={vpnServersCountData} />,
            type: 'standard' as const,
            guarantee: true,
        },
    ].filter(isTruthy);

    const benefitItems = getPassBenefits();
    const benefits = benefitItems && (
        <div>
            <div className="text-lg text-semibold">{getBenefits(PASS_APP_NAME)}</div>
            <Benefits className="mt-5 mb-5" features={benefitItems} />
            <div>{getJoinString()}</div>
        </div>
    );

    return {
        logo,
        title: {
            [SignupMode.Default]: title,
            [SignupMode.Onboarding]: onboardingTitle,
            [SignupMode.Invite]: inviteTitle,
        }[mode],
        features,
        benefits,
        planCards,
        signupTypes: [SignupType.Email],
        generateMnemonic: true,
        defaults: {
            plan: mode === SignupMode.Invite ? PLANS.FREE : PLANS.PASS_PLUS,
            cycle: CYCLE.YEARLY,
        },
        product: APPS.PROTONPASS,
        shortProductAppName: PASS_SHORT_APP_NAME,
        productAppName: PASS_APP_NAME,
        setupImg: <img src={setupPass} alt={c('pass_signup_2023: Onboarding').t`Welcome to ${PASS_APP_NAME}`} />,
        preload: (
            <>
                <link rel="prefetch" href={recoveryKit} as="image" />
                <link rel="prefetch" href={setupPass} as="image" />
                {getInfo(null, noop).preload}
            </>
        ),
        CustomStep,
    };
};
