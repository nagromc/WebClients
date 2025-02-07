import { ElementType, ForwardedRef, ReactElement, forwardRef } from 'react';

import ButtonLike, { ButtonLikeProps } from '@proton/atoms/Button/ButtonLike';
import { CircleLoader } from '@proton/atoms/CircleLoader';
import { Icon, IconName, IconSize } from '@proton/components/components';
import { useActiveBreakpoint } from '@proton/components/hooks';
import useUid from '@proton/components/hooks/useUid';
import { PolymorphicPropsWithRef } from '@proton/react-polymorphic-types';
import clsx from '@proton/utils/clsx';

import './PromotionButton.scss';

type ButtonButtonLikeProps = ButtonLikeProps<'button'>;

interface OwnProps extends Omit<ButtonLikeProps<'button'>, 'as' | 'ref'> {
    iconName?: IconName;
    icon?: boolean;
    iconGradient?: boolean;
    upsell?: boolean;
    shape?: ButtonButtonLikeProps['shape'];
    className?: string;
    loading?: boolean;
    responsive?: boolean;
}

export type PromotionButtonProps<E extends ElementType> = PolymorphicPropsWithRef<OwnProps, E>;

const defaultElement = ButtonLike;

const PromotionButtonBase = <E extends ElementType = typeof defaultElement>(
    {
        children,
        iconName,
        icon,
        iconGradient = true,
        shape = 'outline',
        upsell,
        as,
        className,
        loading,
        responsive = false,
        ...rest
    }: PromotionButtonProps<E>,
    ref: ForwardedRef<Element>
) => {
    let iconSize: IconSize | undefined;
    const { viewportWidth } = useActiveBreakpoint();

    switch (true) {
        case icon && upsell:
            iconSize = 16;
            break;
        default:
            iconSize = 20;
            break;
    }

    if (responsive && !viewportWidth['>=large']) {
        shape = 'ghost';
        icon = true;
    }

    const Element: ElementType = as || defaultElement;

    const uid = useUid('linear-gradient');

    return (
        <ButtonLike
            as={Element}
            ref={ref}
            type="button"
            icon={icon}
            color="weak"
            shape={shape}
            className={clsx(
                'button-promotion max-w-full',
                iconGradient && 'button-promotion--icon-gradient',
                upsell && 'button-promotion--upgrade',
                className
            )}
            {...rest}
        >
            <span
                className={clsx(
                    'relative flex flex-nowrap items-center gap-2',
                    responsive && viewportWidth['>=large'] ? 'w-full' : undefined
                )}
            >
                {iconName && (
                    <Icon
                        name={iconName}
                        className="shrink-0"
                        size={iconSize}
                        style={{ fill: `url(#${uid}) var(--text-norm)` }}
                    />
                )}
                <span className={clsx(icon ? 'sr-only' : 'block text-ellipsis')}>{children}</span>
                {loading && <CircleLoader />}
            </span>
            {iconName && iconGradient ? (
                <svg aria-hidden="true" focusable="false" className="sr-only">
                    <linearGradient id={uid}>
                        <stop offset="0%" stopColor="var(--color-stop-1)" />
                        <stop offset="100%" stopColor="var(--color-stop-2)" />
                    </linearGradient>
                </svg>
            ) : undefined}
        </ButtonLike>
    );
};

const PromotionButton: <E extends ElementType = typeof defaultElement>(
    props: PromotionButtonProps<E>
) => ReactElement | null = forwardRef(PromotionButtonBase);

export default PromotionButton;
