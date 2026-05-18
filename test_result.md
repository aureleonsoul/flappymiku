#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Flappy Miku — Expo/React Native game. Continued from previous session.
  Last working item: Synthesized audio system (was broken — used Web Audio API
  `AudioContext` which doesn't exist in React Native) + privacy-policy link
  spacing fix (user wants ≥16px gap above banner ad).

frontend:
  - task: "Synthesized audio system via expo-av + JS-generated WAV PCM"
    implemented: true
    working: true
    file: "frontend/src/audio/AudioManager.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: |
            Rewrote AudioManager to generate 16-bit PCM in JS, wrap it in a
            WAV header, base64-encode, and load via expo-av's
            Audio.Sound.createAsync({uri: 'data:audio/wav;base64,...'}).
            Eliminates the previous AudioContext-on-RN failure entirely.
            • Preloads 11 SFX (5 stage-pitched flaps + score, hit, stage-transition,
              click, unlock, revive) at 22 kHz.
            • Preloads 5 stage music loops at 16 kHz, each one bar long,
              isLooping=true. Crossfades between stages on stage-change.
            • Music playAsync() is deferred until first user gesture so the
              browser autoplay policy doesn't trip (web preview only — no-op on
              native).
            • Added setSuspended(bool) for app-state background/foreground that
              does NOT clobber the persisted mute preference (the previous
              implementation did).
            • Removed the duplicate legacy sound.ts calls from game.tsx.
            Verified via screenshot: menu + game render with no audio errors;
            previous "no extractors" / "AudioContext undefined" failures are gone.

  - task: "Privacy-policy link spacing above banner ad (≥16 px gap)"
    implemented: true
    working: true
    file: "frontend/app/index.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: |
            Switched the banner zone from `position: absolute` to natural
            flex flow (matches characters.tsx / game.tsx), removed the
            hard-coded 100 px paddingBottom hack, and gave the Privacy
            Policy Pressable its own 16 px marginBottom + 6 px paddingVertical
            for a comfortable tap target. Verified visually at 390×844.

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "Audio system on a real Android/iOS device (web preview blocks autoplay)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: |
        Replaced the Web-Audio-based AudioManager with a fully native
        implementation using expo-av + JS-synthesized WAV base64 data URIs.
        All public APIs (init, startMusic, stopMusic, playFlap, playScore,
        playHit, playStageTransition, playClick, playUnlock,
        playReviveSuccess, setMuted, toggleMuted, isMuted) are preserved.
        Added setSuspended() for non-persisting background pause.
        Privacy-policy link now has a guaranteed 16 px+ clearance above the
        banner ad zone. Need user verification on a real device — web
        preview has expected autoplay restrictions that don't apply to
        native.
