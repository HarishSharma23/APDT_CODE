export function add_years(dt, n) {
    return new Date(dt.setFullYear(dt.getFullYear() + n));
}

export function add_months(dt, n) {
    return new Date(dt.setMonth(dt.getMonth() + n));
}

export function add_days(dt, n) {
    return new Date(dt.setDate(dt.getDate() + n));
}

export function clean_dateText(dt) {
    let d = dt.getDate();
    let m = dt.getMonth() + 1;
    let y = dt.getFullYear();
    // let dateString = (d <= 9 ? '0' + d : d) + '-' + (m <= 9 ? '0' + m : m) + '-' + y;
    return `${d.toString().padStart(2,'0')}-${m.toString().padStart(2,'0')}-${y}`;
}