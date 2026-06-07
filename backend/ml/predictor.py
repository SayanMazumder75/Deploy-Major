# backend/ml/predictor.py
import numpy as np

def predict_performance(data):
    completion_rate = float(data.get('completionRate', 0))
    study_hours = float(data.get('totalStudyHours', 0))
    avg_quiz = float(data.get('avgQuizScore', 0))
    avg_viva = float(data.get('avgVivaScore', 0))
    missed = int(data.get('missedSessions', 0))

    # Weighted prediction formula
    score = (
        completion_rate * 0.30 +
        min(study_hours * 2, 100) * 0.20 +
        avg_quiz * 0.25 +
        avg_viva * 0.25 -
        min(missed * 3, 30)
    )
    score = max(0, min(100, score))

    if score >= 80:
        risk = 'low'
        message = "You're on track! Keep up the consistency."
        grade = 'A'
    elif score >= 60:
        risk = 'medium'
        message = "Moderate risk. Increase study sessions and complete missed ones."
        grade = 'B'
    elif score >= 40:
        risk = 'high'
        message = "High risk of poor performance. Focus on weak topics immediately."
        grade = 'C'
    else:
        risk = 'critical'
        message = "Critical! You need urgent intervention. Start studying now."
        grade = 'D'

    return {
        "predictedScore": round(score, 1),
        "grade": grade,
        "risk": risk,
        "message": message,
        "breakdown": {
            "completionImpact": round(completion_rate * 0.30, 1),
            "studyHoursImpact": round(min(study_hours * 2, 100) * 0.20, 1),
            "quizImpact": round(avg_quiz * 0.25, 1),
            "vivaImpact": round(avg_viva * 0.25, 1),
            "missedPenalty": round(min(missed * 3, 30), 1),
        }
    }