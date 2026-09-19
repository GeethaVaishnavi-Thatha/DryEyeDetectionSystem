import numpy as np
import logging

logger = logging.getLogger(__name__)


def calculate_ear(eye_landmarks):
    """
    Calculate the Eye Aspect Ratio (EAR) to detect blinks and eye openness.
    
    The EAR is computed from 6 eye landmarks using the formula:
        EAR = (||P2-P6|| + ||P3-P5||) / (2.0 * ||P1-P4||)
    
    Parameters:
        eye_landmarks (list or np.array): Coordinates of 6 landmarks representing the eye.
            P1, P4: Horizontal landmarks (outer and inner corners)
            P2, P6: Vertical landmarks (upper lid)
            P3, P5: Vertical landmarks (lower lid)
        
    Returns:
        float: The calculated EAR value. Returns 0.0 if landmarks are degenerate.
    """
    try:
        # Calculate vertical distances
        v1 = np.linalg.norm(np.array(eye_landmarks[1]) - np.array(eye_landmarks[5]))
        v2 = np.linalg.norm(np.array(eye_landmarks[2]) - np.array(eye_landmarks[4]))
        
        # Calculate horizontal distance
        h = np.linalg.norm(np.array(eye_landmarks[0]) - np.array(eye_landmarks[3]))
        
        # Guard against division by zero (degenerate landmarks)
        if h < 1e-6:
            logger.warning("Degenerate eye landmarks detected (horizontal distance ≈ 0)")
            return 0.0
        
        # EAR formula: (||P2-P6|| + ||P3-P5||) / (2.0 * ||P1-P4||)
        ear = (v1 + v2) / (2.0 * h)
        return ear
    except (IndexError, ValueError) as e:
        logger.error("EAR calculation failed: %s", e)
        return 0.0


def assess_dry_eye_risk(ear, blink_rate, screen_time_minutes):
    """
    Determine dry eye risk level based on EAR, blink rate (blinks per minute), 
    and prolonged screen exposure.
    
    Returns:
        tuple: (risk_level: str, risk_score: int)
    """
    risk_score = 0
    
    # Normal blink rate is 15-20 blinks per minute
    if blink_rate < 8:
        risk_score += 3  # High risk contribution
    elif blink_rate < 12:
        risk_score += 2  # Moderate risk contribution
    elif blink_rate < 15:
        risk_score += 1  # Mild risk contribution
        
    # Micro-closures / incomplete blinks check
    if ear < 0.21 and ear > 0.15:
        risk_score += 1
        
    # Prolonged screen time without rest
    if screen_time_minutes > 120:
        risk_score += 3
    elif screen_time_minutes > 60:
        risk_score += 2
    elif screen_time_minutes > 30:
        risk_score += 1
        
    if risk_score >= 5:
        return "High Risk", risk_score
    elif risk_score >= 3:
        return "Moderate Risk", risk_score
    else:
        return "Low Risk", risk_score


def calculate_health_score(ear, blink_rate, screen_time_minutes):
    """
    Calculate a composite eye health score (0-100) from multiple indicators.
    
    This provides a single intuitive metric for the frontend's "AI Health Score" display.
    
    Scoring breakdown:
        - EAR component (0-35): Higher EAR = healthier tear film
        - Blink rate component (0-40): Closer to 15-20 BPM = optimal
        - Screen time penalty (0-25): Longer sessions reduce score
    
    Parameters:
        ear (float): Current Eye Aspect Ratio
        blink_rate (float): Current blinks per minute
        screen_time_minutes (float): Session duration in minutes
    
    Returns:
        int: Health score from 0 (critical) to 100 (optimal)
    """
    # EAR component: optimal range 0.25-0.35
    if ear >= 0.30:
        ear_score = 35
    elif ear >= 0.25:
        ear_score = 30
    elif ear >= 0.21:
        ear_score = 20
    elif ear >= 0.15:
        ear_score = 10
    else:
        ear_score = 0
    
    # Blink rate component: optimal is 15-20 BPM
    if 15 <= blink_rate <= 20:
        blink_score = 40
    elif 12 <= blink_rate < 15 or 20 < blink_rate <= 25:
        blink_score = 30
    elif 8 <= blink_rate < 12:
        blink_score = 15
    else:
        blink_score = 5
    
    # Screen time penalty: 0-20 min is fine, degrades after
    if screen_time_minutes <= 20:
        time_score = 25
    elif screen_time_minutes <= 40:
        time_score = 20
    elif screen_time_minutes <= 60:
        time_score = 15
    elif screen_time_minutes <= 90:
        time_score = 8
    else:
        time_score = 0
    
    return max(0, min(100, ear_score + blink_score + time_score))
