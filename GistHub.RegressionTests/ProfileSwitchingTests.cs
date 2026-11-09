using System.Reflection;
using GistHub.Components.UI;
using GistHub.Models;
using GistHub.Services;

static class ProfileSwitchingTests
{
    public static async Task RunAsync()
    {
        var alice = new GistProfile { Name = "Alice", GithubUsername = "alice" };
        var bob = new GistProfile { Name = "Bob", GithubUsername = "bob" };
        var state = new AppState();
        state.SetProfile(alice);
        var storage = new Profiles { Accounts = [alice, bob] };
        var menu = new ProfileMenu();
        const BindingFlags flags = BindingFlags.Instance | BindingFlags.NonPublic;
        typeof(ProfileMenu).GetProperty("AppState", flags)!.SetValue(menu, state);
        typeof(ProfileMenu).GetProperty("Storage", flags)!.SetValue(menu, storage);
        typeof(ProfileMenu).GetProperty("Navigation", flags)!.SetValue(menu, new FakeNavigationManager());
        var toggle = typeof(ProfileMenu).GetMethod("ToggleAccountsAsync", flags)!;
        await (Task)toggle.Invoke(menu, null)!;
        var accounts = (List<GistProfile>)typeof(ProfileMenu).GetField("SavedProfiles", flags)!.GetValue(menu)!;
        if (!accounts.SequenceEqual(new[] { alice, bob }) || state.CurrentProfile != alice)
            throw new Exception("Opening the switcher must load saved profiles without changing the account.");
        typeof(ProfileMenu).GetMethod("SelectProfile", flags)!.Invoke(menu, [bob]);
        if (state.CurrentProfile != bob || (bool)typeof(ProfileMenu).GetField("ShowAccounts", flags)!.GetValue(menu)!)
            throw new Exception("Selecting an account must update AppState and close the switcher.");
        storage.Fail = true;
        await (Task)toggle.Invoke(menu, null)!;
        if (typeof(ProfileMenu).GetField("AccountsError", flags)!.GetValue(menu) is null || accounts.Count != 0 || state.CurrentProfile != bob)
            throw new Exception("Storage failure must clear stale entries and retain the active account.");
        Console.WriteLine("PASS: account switching loads saved profiles, selects the account, and handles storage failure.");
    }

    private sealed class Profiles : FakeStorageService
    {
        public List<GistProfile> Accounts = new();
        public bool Fail;
        public override Task<List<GistProfile>> GetProfilesAsync() => Fail
            ? Task.FromException<List<GistProfile>>(new Exception("Unavailable"))
            : Task.FromResult(new List<GistProfile>(Accounts));
    }
}
