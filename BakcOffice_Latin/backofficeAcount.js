$(document).ready(async function () {
  $("#tabs").tabs();

  $(".accounts").trigger("click");
  $(".accounts a i").addClass("far fa-hand-point-left");
  $(".accounts a").css("font-weight", "bold");
  $(".accounts a").css("color", "#FFEA2F");

  function calcularNumeroElementosPorPagina() {
    let alturaTabla = $(window).height() * 0.7;
    let resolucionPantalla = window.screen.width;
    if (resolucionPantalla >= 2560 || resolucionPantalla >= 1920) {
      return Math.floor(alturaTabla / 25);
    } else {
      return 25;
    }
  }

  const AUTH_URL =
    "https://auth.latinsecurities.ar/realms/invera-broker/protocol/openid-connect/token";
  const client_id = "condor-via-api";
  const client_secret = "WPpqupSpHpcWOfbdLSosGBlcXluv9RH8";
  const grant_type = "client_credentials";

  let accesToken = "";

  const fetchToken = async () => {
    try {
      console.log("Renovando token...");

      const response = await fetch(AUTH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type,
          client_id,
          client_secret,
        }),
      });
      if (!response.ok) {
        throw new Error("Error al obtener el token de acceso");
      }

      const data = await response.json();
      accesToken = data.access_token;
      setTimeout(fetchToken, 300000);
    } catch (error) {
      console.error("Error al obtener el token de acceso:", error);
    }
  };

  await fetchToken();

  const allCounts = async () => {
    const URL =
      "https://api.latinsecurities.ar/v1_0/api/accounts/investment-accounts-associated/18baae5e-cb8b-405b-b962-d5591a0efb4d";

    $("#loading-data-allacount").on("click", async function () {
      $("#loading-data-allacount").html(`
        <span style="display: flex; align-items: center; gap: 8px">
          <p style="margin-left: 0.5rem; font-size: 14px;">Cargando datos</p>
          <i class="fa fa-spinner fa-spin" style="font-size:16px"></i>
        </span>
        `);
      try {
        const response = await fetch(URL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accesToken}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error("Error");
        }
        const data = await response.json();
        $("#loading-data-allacount").remove();

        $("#tableallaccounts").dataTable({
          data: data.investment_accounts,
          searching: true,
          ordering: true,
          paging: true,
          autowidth: true,
          pageLength: calcularNumeroElementosPorPagina(),
          info: true,
          dom: "Bfrtip",
          buttons: [
            {
              text: "Excel",
              extend: "excel",
            },
          ],
          columns: [
            { data: "fullname", title: "Full name" },
            {
              data: "investment_account_number",
              title: "Investment account number",
            },
            {
              data: "investment_account_code",
              title: "Investment account code",
            },
          ],
        });

        // fomateo de los tbody si el value es un number, date o etc hacer un text-align right
      } catch (error) {
        console.log(error);
      }
    });
  };

  allCounts();

  const investmentAccount = async () => {
    const URL =
      "https://api.latinsecurities.ar/v1_0/api/accounts/investment-accounts/18baae5e-cb8b-405b-b962-d5591a0efb4d?client_name=&page=1&size=10";
    $("#loading-data-accountInvestement").on("click", async function () {
      $("#loading-data-accountInvestement").html(`
        <span style="display: flex; align-items: center; gap: 8px">
          <p style="margin-left: 0.5rem; font-size: 14px;">Cargando datos</p>
          <i class="fa fa-spinner fa-spin" style="font-size:16px"></i>
        </span>
        `);
      try {
        const response = await fetch(URL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accesToken}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error("Error");
        }
        let data = await response.json();

        $("#loading-data-accountInvestement").remove();

        $("#tableinvestment").dataTable({
          data: data,
          searching: true,
          ordering: true,
          paging: true,
          info: true,
          autowidth: true,
          pageLength: calcularNumeroElementosPorPagina(),
          dom: "Bfrtip",
          buttons: [
            {
              text: "Excel",
              extend: "excel",
            },
          ],
          columns: [
            { data: "client", title: "Client" },
            { data: "cuit_cuil", title: "CUIT/CUIL" },
            {
              data: "investment_account_id",
              title: "Investment account number",
            },
          ],
        });
      } catch (error) {
        console.log(error);
      }
    });
  };

  investmentAccount();
});
