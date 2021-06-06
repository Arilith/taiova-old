"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateYYYYMMDD = void 0;
const DateYYYYMMDD = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() < 10
        ? `0${currentDate.getMonth() + 1}`
        : currentDate.getMonth() + 1;
    const currentDay = currentDate.getUTCDate() < 10
        ? `0${currentDate.getUTCDate()}`
        : currentDate.getUTCDate();
    return `${currentYear}${currentMonth}${currentDay}`;
};
exports.DateYYYYMMDD = DateYYYYMMDD;
//# sourceMappingURL=date.js.map