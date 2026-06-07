# backend/ml/scheduler.py
from datetime import datetime, timedelta
import numpy as np

SUBJECT_COLORS = [
    '#8B5CF6', '#EF4444', '#10B981', '#F59E0B',
    '#3B82F6', '#EC4899', '#14B8A6', '#F97316',
]

def generate_schedule(exams, hours_per_day, days_per_week, start_time, weak_topics):
    if not exams:
        return []

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    schedule = []
    color_map = {}

    # Parse exam dates and sort by urgency
    parsed_exams = []
    for i, exam in enumerate(exams):
        exam_date = datetime.fromisoformat(exam['examDate'][:10])
        days_left = (exam_date - today).days
        hours_needed = float(exam.get('hoursNeeded', 10)) - float(exam.get('hoursStudied', 0))
        hours_needed = max(hours_needed, 1)
        priority_weight = {'high': 1.5, 'medium': 1.0, 'low': 0.7}.get(exam.get('priority', 'medium'), 1.0)
        color_map[exam['subject']] = SUBJECT_COLORS[i % len(SUBJECT_COLORS)]
        parsed_exams.append({
            **exam,
            'exam_date': exam_date,
            'days_left': days_left,
            'hours_needed': hours_needed,
            'priority_weight': priority_weight,
            'color': SUBJECT_COLORS[i % len(SUBJECT_COLORS)],
        })

    # Sort: closest exam first, highest priority first
    parsed_exams.sort(key=lambda x: (x['days_left'], -x['priority_weight']))

    # Allocate hours per subject proportionally
    total_weight = sum(e['hours_needed'] * e['priority_weight'] for e in parsed_exams)
    start_h, start_m = map(int, start_time.split(':'))

    # Build daily schedule
    current_date = today + timedelta(days=1)
    exam_dates = {e['exam_date'].date() for e in parsed_exams}
    sessions_per_subject = {e['subject']: 0 for e in parsed_exams}
    max_sessions = {e['subject']: int(np.ceil(e['hours_needed'])) for e in parsed_exams}

    week_day_count = 0
    last_week = -1

    while any(sessions_per_subject[e['subject']] < max_sessions[e['subject']] for e in parsed_exams):
        # Skip exam days
        if current_date.date() in exam_dates:
            current_date += timedelta(days=1)
            continue

        # Skip weekends based on days_per_week
        if days_per_week <= 5 and current_date.weekday() >= 5:
            current_date += timedelta(days=1)
            continue

        # Max 2 subjects per day
        day_subjects = 0
        slot_start_h = start_h
        slot_start_m = start_m

        for exam in parsed_exams:
            if day_subjects >= 2:
                break
            subj = exam['subject']
            if sessions_per_subject[subj] >= max_sessions[subj]:
                continue

            duration = 60 if exam['priority_weight'] < 1.0 else 90
            end_minutes = slot_start_h * 60 + slot_start_m + duration
            end_h, end_m = divmod(end_minutes, 60)

            schedule.append({
                "subject": subj,
                "date": current_date.strftime('%Y-%m-%d'),
                "startTime": f"{slot_start_h:02d}:{slot_start_m:02d}",
                "endTime": f"{end_h:02d}:{end_m:02d}",
                "duration": duration,
                "priority": exam.get('priority', 'medium'),
                "color": exam['color'],
            })

            sessions_per_subject[subj] += 1
            slot_start_h = end_h + 1
            day_subjects += 1

        current_date += timedelta(days=1)

        # Safety: don't go more than 90 days out
        if (current_date - today).days > 90:
            break

    return schedule