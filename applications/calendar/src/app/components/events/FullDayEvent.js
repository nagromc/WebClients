import React, { useMemo } from 'react';
import { Icon, classnames } from 'react-components';

import { useReadCalendarEvent, useReadEvent } from './useReadCalendarEvent';
import { getConstrastingColor } from '../../helpers/color';

const FullDayEvent = ({
    style,
    formatTime,
    className = 'calendar-dayeventcell absolute alignleft',
    event: { start, data: { Calendar } = {}, data: targetEventData, isAllDay, isAllPartDay, tmpData },
    isSelected,
    isBeforeNow,
    isOutsideStart,
    isOutsideEnd,
    eventRef,
    onClick
}) => {
    const [value, loading, error] = useReadCalendarEvent(targetEventData);
    const model = useReadEvent(value);

    const calendarColor = Calendar.Color;

    const eventStyle = useMemo(() => {
        if (!isAllDay) {
            return {};
        }
        const background = calendarColor;
        return {
            background,
            color: getConstrastingColor(background)
        };
    }, [calendarColor, isAllDay, isSelected]);

    const timeString = useMemo(() => {
        return formatTime(start);
    }, [start]);

    const titleString = (tmpData && tmpData.title) || (!loading && model.title) || '';

    const content = (() => {
        if (error) {
            return <Icon name="lock" className="fill-currentColor" />;
        }

        return (
            <div className="flex flex-nowrap w100 bg-inherit">
                <span
                    className={classnames([
                        'flex-item-fluid flex flex-nowrap w100 flex-items-center',
                        loading && 'calendar-skeleton-loading'
                    ])}
                >
                    {!isAllDay ? (
                        <Icon className="mr0-25 flex-item-noshrink" size={12} name="circle" color={calendarColor} />
                    ) : null}
                    {loading ? '' : <span className="flex-item-fluid ellipsis">{titleString}</span>}
                </span>
                {isAllPartDay ? <span className="">{timeString}</span> : null}
            </div>
        );
    })();

    return (
        <div
            style={style}
            className={classnames([
                className,
                isBeforeNow && 'calendar-dayeventcell--isBefore',
                isOutsideStart && 'calendar-dayeventcell--isOutsideStart',
                isOutsideEnd && 'calendar-dayeventcell--isOutsideEnd'
            ])}
            data-ignore-create="1"
        >
            <div
                onClick={onClick}
                className={classnames([
                    'calendar-dayeventcell-inner alignleft flex w100 pl0-5 pr0-5',
                    !isAllDay && 'calendar-dayeventcell-inner--notAllDay',
                    isOutsideStart && 'calendar-dayeventcell-inner--isOutsideStart',
                    isOutsideEnd && 'calendar-dayeventcell-inner--isOutsideEnd'
                ])}
                style={eventStyle}
                ref={eventRef}
            >
                {isOutsideStart ? (
                    <span className="calendar-dayeventcell-inner-isOutsideStart" style={eventStyle}></span>
                ) : (
                    ''
                )}
                {content}
                {isOutsideEnd ? (
                    <span className="calendar-dayeventcell-inner-isOutsideEnd" style={eventStyle}></span>
                ) : (
                    ''
                )}
            </div>
        </div>
    );
};

export default FullDayEvent;
