# Feature Implementation Prompt – My Sitting Challenge

## Objective
Add a new feature to the existing ADHD awareness website called **“My Sitting Challenge.”**

The goal is to help children practise comfortable sitting, focus, and engagement in simple enjoyable activities for gradually increasing durations. The experience must be encouraging, flexible, child-friendly, and free from pressure.

This is a **self-regulation and activity-engagement practice**, not a diagnostic tool or behavioural compliance test.

---

## 1. Analyze the Existing Website First

Before making any changes:

- Examine the existing project structure, framework, components, styles, routing, and navigation.
- Understand the existing website's theme, colour palette, typography, layout, and responsive design.
- Identify how new pages and navigation items are currently implemented.
- Follow the existing coding conventions and reuse existing components wherever possible.

**Important constraints:**
- Do not redesign the existing website.
- Do not modify existing pages, content, functionality, styling, or components unnecessarily.
- Do not break existing navigation or features.
- Add this feature as a separate page/module.
- Only make the changes required to integrate the new feature into the existing website.

---

## 2. New Page – My Sitting Challenge

Create a separate page titled:

# 🪑 My Sitting Challenge

Subtitle:

*"I can enjoy an activity at my own pace. Every little effort counts!"*

Design a colourful, friendly, engaging interface suitable for children. Use illustrations, playful icons, soft colours, visual feedback, and simple language.

The page should feel welcoming and not like a classroom test, examination, or discipline tracker.

---

## 3. Select Practice Duration

Allow children to choose one of the following practice durations:

- 2 minutes
- 3 minutes
- 5 minutes
- 10 minutes

Display the options as large clickable cards or buttons.

The child should be able to choose any duration freely. Do not force the child to start with the shortest duration or automatically increase duration.

---

## 4. Activity Selection

Provide built-in activity choices using colourful cards and icons:

- 🎨 Coloring / Drawing
- 📚 Picture Book Reading
- 🧩 Simple Puzzles
- 🧱 Building Blocks

Allow parents to add their own custom activities through a simple interface.

### Custom activity functionality:
- Add a new activity name.
- Optionally select or assign an emoji/icon.
- Save the custom activity in Chrome Local Storage.
- Display custom activities along with the default activities.
- Allow parents to edit or delete custom activities.
- Prevent duplicate or empty activity names.

The child should be able to select an activity before starting the challenge.

---

## 5. Visual Countdown Timer

Display a large, attractive, easy-to-read countdown timer.

Requirements:
- Clearly display the remaining time.
- Use a visual representation of time, such as a circular progress ring, animated bar, or other intuitive visual indicator.
- Show the selected activity and duration.
- Use gentle animations when the timer is running.
- Avoid distracting or excessive animation.
- Ensure the timer is readable from a distance.

Example:

**Activity:** Coloring 🎨

**Selected Time:** 3 Minutes

**Remaining Time:** 02:45

---

## 6. Timer Controls

Provide the following controls:

- **Start** – Begin the challenge.
- **Pause** – Temporarily pause the timer.
- **Resume** – Continue from where it was paused.
- **Reset** – Reset the current session to the selected duration.
- **Finish Early** – Allow the child to finish whenever they wish.
- **Movement Break** – Stop the sitting practice and allow the child to move freely.

Timer logic must work correctly. Avoid duplicate timer intervals, incorrect countdowns, or timer continuing in the background after stopping or resetting.

If the child finishes early or takes a movement break, display positive and neutral responses without guilt, failure indicators, or negative feedback.

---

## 7. Positive Completion Messages

When the timer reaches zero, show a cheerful completion screen with encouraging messages.

Use varied motivational messages such as:

- "Wonderful! Thank you for trying! 🌟"
- "You spent time doing something you enjoy!"
- "Every little moment of practice counts!"
- "You did it your way, and that's great!"
- "Great job exploring and learning!"
- "Taking time for yourself is wonderful!"

For early stopping or movement breaks, use messages such as:

- "Good job listening to your body!"
- "Movement is important too!"
- "You can try again whenever you feel ready!"
- "Thank you for giving it a try!"

Do not use messages such as:
- You failed.
- You didn't complete the challenge.
- You must sit longer next time.
- You need to improve your score.

Do not compare children or sessions.

---

## 8. Parent Dashboard

Create a separate parent dashboard section that can be opened from the sitting challenge page.

Store the data locally using **Chrome Local Storage**. No backend, database, login, or cloud storage is required for this feature.

Record the following information for each practice session:

- Date and time
- Selected duration (2, 3, 5 or 10 minutes)
- Actual practice duration
- Selected activity
- Session status (Completed, Finished Early, Movement Break)
- Parent observations (optional free-text notes)

### Dashboard features:
- View past practice sessions.
- Display records in chronological order.
- Add or edit parent observations.
- Delete an individual record.
- Provide a clear confirmation before deleting.
- Show a friendly empty state when there are no records.
- Provide an option to clear all session history with confirmation.

Ensure data persists after refreshing or reopening the browser.

---

## 9. Progress Chart

Include a simple, child- and parent-friendly progress chart displaying actual practice duration over time.

Requirements:
- X-axis: Date
- Y-axis: Actual practice duration in minutes
- Plot actual practice time for each session.
- Allow parents to understand participation patterns over time.
- Use a simple line chart or bar chart.
- Ensure it works on mobile screens.

The chart must not represent the data as scores, rankings, success rates, or performance grades.

Avoid misleading trends, exaggerated improvement claims, or comparisons between children.

If no session data is available, show a friendly message instead of an empty or broken chart.

---

## 10. Gradual Progression and Flexibility

The feature must support gradual progression based on the child's comfort and participation.

- Do not automatically increase the practice duration.
- Do not recommend increasing duration just because the child completed a session.
- Allow the parent and child to repeat any duration they feel comfortable with.
- A shorter session is equally acceptable.
- Participation, comfort, enjoyment, and self-regulation are more important than duration.
- Parents should be encouraged to notice the child's interests and comfort rather than focus on how long the child sits.

Optionally display a small parent tip:

*"Let your child choose an activity and a comfortable time. Repeat, shorten, or take breaks whenever needed. There is no need to increase the time every day."*

---

## 11. UI / UX Design

The design should be:

- Colourful and child-friendly.
- ADHD-friendly with minimal distractions.
- Simple and intuitive.
- Accessible with large clickable controls.
- Easy to use without reading lengthy instructions.
- Responsive for desktop, tablets, and mobile phones.

Use:
- Activity cards.
- Large timer typography.
- Clear Start/Pause/Resume/Reset controls.
- Friendly icons and illustrations.
- Gentle visual transitions.
- Readable text and sufficient contrast.
- Clear feedback after every action.

Avoid:
- Overcrowded layouts.
- Too many animations.
- Punitive colours or warning styles for incomplete sessions.
- Streaks, leaderboards, badges tied to duration, or competitive scoring.
- Reward systems that pressure children to sit longer.

---

## 12. Responsive Design

Ensure the new page works correctly across:

- Desktop computers
- Tablets
- Mobile phones

On mobile:
- Stack cards vertically when necessary.
- Make controls easy to tap.
- Keep the countdown visible without scrolling excessively.
- Ensure the parent dashboard and chart fit the screen.
- Avoid horizontal overflow.

---

## 13. Data Storage

Use Chrome Local Storage.

Use a dedicated, namespaced storage structure for this feature to avoid conflicts with other website data.

Store:
- Session history
- Parent observations
- Custom activity choices

Requirements:
- Validate data before saving.
- Handle missing or corrupted storage gracefully.
- Avoid overwriting unrelated Local Storage entries.
- Persist custom activities and session history after browser refresh.

No server-side storage is required.

---

## 14. Safety and Content Guidelines

This feature is designed to support children with ADHD through positive self-regulation and activity engagement.

Do not:
- Claim that sitting still cures ADHD.
- Claim that the activity guarantees changes in brain connectivity.
- Present sitting duration as a measure of intelligence, ability, or ADHD severity.
- Encourage forcing a child to sit despite discomfort.
- Use guilt, punishment, failure, or negative feedback.
- Treat movement breaks as a failure.
- Make medical or diagnostic claims.

Use positive, neutral, supportive language throughout.

---

## 15. Navigation Integration

Add **“My Sitting Challenge”** to the existing website navigation in the appropriate location.

- Follow the existing navigation design.
- Ensure the new page opens correctly.
- Ensure navigation back to other pages continues to work.
- Do not alter existing menu items or their functionality.
- Follow the website's existing routing pattern.

---

## 16. Testing and Validation

After implementation:

1. Verify the new page loads successfully.
2. Verify duration selection works for all four options.
3. Verify default activities can be selected.
4. Verify parents can add, edit, and delete custom activities.
5. Verify Start, Pause, Resume, Reset, Finish Early, and Movement Break controls.
6. Verify countdown timing and timer cleanup.
7. Verify completed and early-ended sessions are recorded correctly.
8. Verify parent observations can be saved and edited.
9. Verify data persists after refreshing the page.
10. Verify the progress chart displays stored session data accurately.
11. Verify empty states work.
12. Verify responsive layout on mobile, tablet, and desktop.
13. Verify existing website pages and features remain unchanged.

Fix any bugs found during testing.

---

## Final Deliverable

Implement the complete **My Sitting Challenge** feature in the existing website.

At the end, provide a concise implementation summary describing:

- New files created.
- Existing files modified.
- Navigation integration.
- Timer implementation.
- Local Storage structure.
- Parent dashboard and chart.
- Tests or validations performed.
- Any remaining issues.

**Keep the implementation isolated, maintainable, responsive, and consistent with the existing website. Do not modify other pages.**