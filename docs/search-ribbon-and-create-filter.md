# Search, ribbon badges, and create destination

Highlight the complete search-input wrapper (icon, textbox, and Esc hint) on focus, suppressing the inner textbox ring. Keep search, keyboard navigation, and dismissal unchanged.

Show the ribbon Quick Access favorite toggle as a top-right badge on command tiles, including touch layouts. Keep its pressed state, accessible label, persistence, and Quick Access reordering actions intact.

After creating a gist, navigate to My Collection with favorites=true when the user selected Bookmarked. An unbookmarked creation opens the unfiltered collection. Existing gist edits retain their destination. Preserve GitHub saves, local metadata and draft cleanup.

Verify build, search browser checks, Quick Access preference/reorder checks, and mocked create/save navigation for both bookmark values; do not create real GitHub gists during testing.
