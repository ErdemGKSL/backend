const dbi = require("../../dbi.js");

dbi.register(({ Locale }) => {
  Locale({
    name: "en",
    data: {
      none: "None",

      inviter_set__my_acord_link_required: "To use this command, you must first link your account with Acord.",
      inviter_set__inviter_acord_link_required: "The person who invited you must also link their account with Acord.",
      inviter_set__already_set: "You have already set your inviter. (Your inviter: {0})",
      inviter_set__invalid_user: "Invalid user.",
      inviter_set__success: "Your inviter has been successfully set. (Your inviter: {0})",

      my_invites_list__list: "Invited by: {0}\nYou have invited {1} people to Acord.\n__Last people you invited:__\n{2}",
      my_invites_list__none: "You have not invited anyone to Acord yet."
    }
  });
});