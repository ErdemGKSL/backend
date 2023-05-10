const dbi = require("../../dbi.js");

dbi.register(({ Locale }) => {
  Locale({
    name: "tr",
    data: {
      none: "Yok",

      inviter_set__my_acord_link_required: "Bu komutu kullanabilmen için önce Acord ile hesabını bağlaman gerekiyor.",
      inviter_set__inviter_acord_link_required: "Seni davet eden kişinin de Acord ile hesabını bağlaması gerekiyor.",
      inviter_set__already_set: "Davetçini zaten ayarlamışsın. (Davetçin: {0})",
      inviter_set__invalid_user: "Geçersiz kullanıcı.",
      inviter_set__success: "Davetçin başarıyla ayarlandı. (Davetçin: {0})",

      my_invites_list__list: "Seni davet eden: {0}\nSen Acord'a {1} kişi davet ettin.\n__Son davet ettiğin kişiler:__\n{2}",
      my_invites_list__none: "Acord'a henüz kimseyi davet etmedin."
    }
  });
});