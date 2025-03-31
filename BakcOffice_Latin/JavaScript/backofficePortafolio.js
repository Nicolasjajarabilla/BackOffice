$("#document").ready(async function () {
  $("#tabs").tabs();
  $("#tabs2").tabs();
  $("#tabs3").tabs();
  $("#tabs4").tabs();

  $(".portafolio").trigger("click");
  $(".portafolio a i").addClass("far fa-hand-point-left");
  $(".portafolio a").css("font-weight", "bold");
  $(".portafolio a").css("color", "#FFEA2F");

  // script para el tab de Available Currency

  function calcularNumeroElementosPorPagina() {
    let alturaTabla = $(window).height() * 0.7;
    let resolucionPantalla = window.screen.width;
    if (resolucionPantalla >= 2560 || resolucionPantalla >= 1920) {
      return Math.floor(alturaTabla / 25);
    } else {
      return 25;
    }
  }

  // Crear un AbortController
  let controller;

  function formatDate(isoDate) {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  }

  const AUTH_URL =
    "https://auth.latinsecurities.ar/realms/invera-broker/protocol/openid-connect/token";
  const client_id = "condor-via-api";
  const client_secret = "WPpqupSpHpcWOfbdLSosGBlcXluv9RH8";
  const grant_type = "client_credentials";

  let accesToken = "";

  const fetchToken = async () => {
    try {
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
  // 5 minutos

  const ensureToken = async () => {
    if (!accesToken) {
      console.log("Token no disponible, obteniendo uno nuevo...");
      await fetchToken();
    }
  };

  // ----- HOLDING INICIO -----

  const consolidatedHolding = async () => {
    const url =
      "https://api.latinsecurities.ar/v1_0/api/portfolio/holding/consolidated/18baae5e-cb8b-405b-b962-d5591a0efb4d";
    await ensureToken();

    $("#loading-data-consolidated-holding").on("click", async function () {
      $("#loading-data-consolidated-holding").html(`
        <span style="display: flex; align-items: center; gap: 8px">
          <p style="margin-left: 0.5rem; font-size: 14px;">Cargando datos</p>
          <i class="fa fa-spinner fa-spin" style="font-size:16px"></i>
        </span>
        `);
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accesToken}`,
          },
        });
        if (!response.ok) {
          throw new Error("HTTP error, status = " + response.status);
        }

        const data = await response.json();
        $("#loading-data-consolidated-holding").hide();

        $("#tableconsolidatedHolding").dataTable({
          data: data,
          autowidth: true,
          searching: true,
          info: true,
          pageLength: calcularNumeroElementosPorPagina(),
          scrollCollapse: true,
          dom: "Bfrtip",
          buttons: [
            {
              extend: "excelHtml5",
              customize: function (xlsx) {
                var sheet = xlsx.xl.worksheets["sheet1.xml"];

                // Aplicar estilo existente (ejemplo: 64)
                $('row c[r^="B"]', sheet).attr("s", "64"); // Números normales
              },
              exportOptions: {
                format: {
                  body: function (data, row, column, node) {
                    // Verificar si el dato es válido y convertirlo a cadena
                    if (typeof data !== "undefined" && data !== null) {
                      data = String(data).trim(); // Convertir a cadena y eliminar espacios

                      // Formatear columnas con números
                      if (column === 1) {
                        // Formato para español: Decimales con coma y miles con punto
                        data = data.replace(/[^\d,.-]/g, ""); // Eliminar caracteres no numéricos
                        if (data.includes(",")) {
                          // Asegurarse de que solo haya un separador decimal
                          const parts = data.split(",");
                          parts[0] = parts[0].replace(/[\.]/g, ""); // Eliminar puntos en la parte entera
                          data = parts.join("."); // Reconstruir con coma como separador decimal
                        } else {
                          data = data.replace(/[\.]/g, ""); // Eliminar puntos si no hay coma
                        }
                        return data; // Devolver dato formateado
                      }

                      // Formatear columnas con fechas
                      else if (column === 3 || column === 4) {
                        const arr = data.split(".");
                        if (arr.length === 3) {
                          return arr[0] + arr[1] + arr[2]; // Concatenar día, mes, año
                        } else if (arr.length === 2) {
                          return arr[0] + arr[1]; // Concatenar día y mes
                        } else if (arr.length === 1) {
                          return arr[0]; // Día solamente
                        }
                      }
                    }

                    return data; // Devolver dato original si no hay transformaciones
                  },
                },
              },
            },
          ],
          columnDefs: [
            {
              className: "dt-body-right",
              targets: [1],
            },
            {
              targets: 1,
              data: function (row, type, val, meta) {
                if (type === "set") {
                  row[meta.col] = val;
                  return;
                } else if (type === "display") {
                  return formatNumber(row[meta.col], 2);
                }
                return row[meta.col];
              },
            }, // decimales específicos ARS
          ],
          columns: [
            { data: "currency", title: "Currency" },
            {
              data: "total_valued_holdings",
              title: "Total valued holdings",
              render: function (data, type, row, meta) {
                return formatNumber(data, 2);
              },
            },
          ],
        });
      } catch (error) {
        console.error(error);
      }
    });
  };

  consolidatedHolding();

  $("#loading-data-table-holding-balance").on("click", function () {
    $("#frmHoldingBalance").dialog("open");
  });

  const parametrosHoldings = $("#frmHoldingBalance").dialog({
    title: "Cargar datos",
    autoOpen: false,
    modal: true,
    width: 415,
    classes: {
      "ui-dialog": "custom-dialog",
    },
    height: "auto",
    buttons: {
      CARGAR: async function () {
        $("#date").prop("disabled", true);
        $("#cuentaInvestment").prop("disabled", true);

        if (
          !$(
            "#frmHoldingBalance input[name='account'], #frmHoldingBalance input[name='from_date']"
          ).valid()
        ) {
          return;
        }
        const from_date = $("#date").val();
        const investment_account_id = $("#cuentaInvestment").val();

        const spinnerContainer = `
        <div id="spinnerContainer" style="display: flex; align-items: center; margin-right: 1rem;">
            <i class="fa fa-spinner fa-spin" style="font-size:16px"></i>
            <p style="margin-left: 0.5rem; font-size: 16px; font-weight: 600">Cargando datos...</p>
        </div>
    `;
        const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
        buttonPane.css("display", "flex");
        buttonPane.css("justify-content", "flex-end");
        buttonPane.find("button").prop("disabled", true); // Desactivar todos los botones
        buttonPane.find("#spinnerContainer").remove(); // Eliminar cualquier spinner existente
        buttonPane.prepend(spinnerContainer);

        const holdingBalance = async () => {
          controller = new AbortController();
          const signal = controller.signal;

          const url = `https://api.latinsecurities.ar/v1_0/api/portfolio/holding/balances/18baae5e-cb8b-405b-b962-d5591a0efb4d?from_date=${from_date}&investment_account_id=${investment_account_id}`;
          await ensureToken();
          try {
            const response = await fetch(url, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accesToken}`,
              },
              signal: signal,
            });
            if (!response.ok) {
              throw new Error("HTTP error, status = " + response.status);
            }
            const data = await response.json();

            if (!data || data.length === 0) {
              // Mostrar mensaje en el modal sin cerrarlo
              $("#spinnerContainer").empty().append(`
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <i class="fa fa-info-circle" style="font-size: 16px; color: orange;"></i>
                  <p style="margin-top: 0px; font-size: 16px; font-weight: 600; color: orange;">
                    Datos no encontrados.
                  </p>
                </div>
              `);
              $("#date").prop("disabled", false);
              $("#cuentaInvestment").prop("disabled", false);
              buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
              return; // Salir de la función sin cerrar el modal
            }

            if ($.fn.dataTable.isDataTable("#tableHoldingBalance")) {
              const table = $("#tableHoldingBalance").DataTable();
              table.clear();
              table.rows.add(data);
              table.draw;
            } else {
              $("#tableHoldingBalance").dataTable({
                data: data, // Asigna los datos obtenidos de la API
                autowidth: true, // Desactiva el ajuste automático del ancho
                scrollX: true, // Habilita el desplazamiento horizontal
                pageLength: calcularNumeroElementosPorPagina(),
                scrollCollapse: true,
                info: true,
                searching: true,
                scrollY: "62dvh",
                dom: "Bfrtip",
                buttons: [
                  {
                    text: "Cargar datos",
                    action: function (e, dt, node, config) {
                      parametrosHoldings.dialog("open");
                    },
                  },
                  {
                    extend: "excelHtml5",
                    customize: function (xlsx) {
                      var sheet = xlsx.xl.worksheets["sheet1.xml"];

                      // Aplicar estilo existente (ejemplo: 64)
                      $('row c[r^="B"]', sheet).attr("s", "64"); // Números normales
                    },
                    exportOptions: {
                      format: {
                        body: function (data, row, column, node) {
                          // Verificar si el dato es válido y convertirlo a cadena
                          if (typeof data !== "undefined" && data !== null) {
                            data = String(data).trim(); // Convertir a cadena y eliminar espacios

                            // Formatear columnas con números
                            if (column === 1) {
                              // Formato para español: Decimales con coma y miles con punto
                              data = data.replace(/[^\d,.-]/g, ""); // Eliminar caracteres no numéricos
                              if (data.includes(",")) {
                                // Asegurarse de que solo haya un separador decimal
                                const parts = data.split(",");
                                parts[0] = parts[0].replace(/[\.]/g, ""); // Eliminar puntos en la parte entera
                                data = parts.join("."); // Reconstruir con coma como separador decimal
                              } else {
                                data = data.replace(/[\.]/g, ""); // Eliminar puntos si no hay coma
                              }
                              return data; // Devolver dato formateado
                            }

                            // Formatear columnas con fechas
                            else if (column === 3 || column === 4) {
                              const arr = data.split(".");
                              if (arr.length === 3) {
                                return arr[0] + arr[1] + arr[2]; // Concatenar día, mes, año
                              } else if (arr.length === 2) {
                                return arr[0] + arr[1]; // Concatenar día y mes
                              } else if (arr.length === 1) {
                                return arr[0]; // Día solamente
                              }
                            }
                          }

                          return data; // Devolver dato original si no hay transformaciones
                        },
                      },
                    },
                  },
                ],
                columnDefs: [
                  {
                    className: "dt-body-right",
                    targets: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
                  },
                  {
                    targets: 1,
                    data: function (row, type, val, meta) {
                      if (type === "set") {
                        row[meta.col] = val;
                        return;
                      } else if (type === "display") {
                        return formatNumber(row[meta.col], 2);
                      }
                      return row[meta.col];
                    },
                  }, // decimales específicos ARS
                ],
                columns: [
                  { data: "description", title: "Description" },
                  {
                    data: "investment_account_id",
                    title: "Investment account id",
                  },
                  {
                    data: "investment_account_code",
                    title: "Investment account code",
                  },
                  {
                    data: "instrument_id",
                    title: "Instrument id",
                  },
                  {
                    data: "currency_id",
                    title: "Currency id",
                  },
                  {
                    data: "currency_description",
                    title: "Currency description",
                  },
                  { data: "client_name", title: "Nombre del cliente" },
                  {
                    data: "instrument_abreviation",
                    title: "Instrument abreviation",
                  },
                  {
                    data: "price",
                    title: "Price",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "overdue_amount",
                    title: "Overdue amount",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "overdue_value",
                    title: "Overdue value",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "settlement_24_amount",
                    title: "Settlement 24 amount",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "settlement_24_value",
                    title: "Settlement 24 value",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "settlement_future_amount",
                    title: "Settlement future amount",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "settlement_future_value",
                    title: "Settlement future value",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "warranty_amount",
                    title: "Warranty amount",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "warranty_value",
                    title: "Warranty value",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "accumulated_balance_amount",
                    title: "Accumulated balance amount",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "accumulated_balance_value",
                    title: "Accumulated balance value",

                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  { data: "currency_symbol", title: "Currency symbol" },
                ],
              });
            }
          } catch (error) {
            if (error.name === "AbortError") {
              console.log("Fetch abortado");
            } else {
              console.error("Fetch fallido:", error);
            }
          }
        };

        try {
          await holdingBalance();
        } catch (error) {
          console.error("Error al obtener los datos", error);
        } finally {
          if (
            !$("#spinnerContainer")
              .find("p")
              .text()
              .includes("Datos no encontrados")
          ) {
            $("#spinnerContainer").hide();
            parametrosHoldings.dialog("close");
            $("#loading-data-table-holding-balance").hide();
          }
        }
      },
      CANCELAR: function () {
        parametrosHoldings.dialog("close");
        $("#spinnerContainer").remove();
        $("#frmHoldingBalance").validate().resetForm(); // Restablecer las validaciones
        $("#frmHoldingBalance input").attr("placeholder", ""); // Restablecer los placeholders
        $("#date").prop("disabled", false);
        $("#cuentaInvestment").prop("disabled", false);
        buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
        controller.abort(); // Cancelar la solicitud
      },
    },
    close: function () {
      $("#spinnerContainer").remove();
      $("#frmHoldingBalance").validate().resetForm(); // Restablecer las validaciones
      $("#frmHoldingBalance input").attr("placeholder", ""); // Restablecer los placeh
      $("#date").prop("disabled", false);
      $("#cuentaInvestment").prop("disabled", false);
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
    },
  });

  const valueHolding = async () => {
    const URL =
      "https://api.latinsecurities.ar/v1_0/api/portfolio/holdings/government-securities/18baae5e-cb8b-405b-b962-d5591a0efb4d";
    await ensureToken();

    $("#loading-data-value-holding").on("click", async function () {
      $("#loading-data-value-holding").html(`
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
          throw new Error("HTTP error, status = " + response.status);
        }
        const data = await response.json();
        $("#loading-data-value-holding").hide();

        $("#tableValueHolding").dataTable({
          dom: "Bfrtip",
          autowidth: true,
          scrollCollapse: true,
          searching: true,
          info: true,
          pageLength: calcularNumeroElementosPorPagina(),
          data: data,
          buttons: [
            {
              extend: "excelHtml5",
              customize: function (xlsx) {
                var sheet = xlsx.xl.worksheets["sheet1.xml"];

                // Aplicar estilo existente (ejemplo: 64)
                $('row c[r^="B"]', sheet).attr("s", "64"); // Números normales
              },
              exportOptions: {
                format: {
                  body: function (data, row, column, node) {
                    // Verificar si el dato es válido y convertirlo a cadena
                    if (typeof data !== "undefined" && data !== null) {
                      data = String(data).trim(); // Convertir a cadena y eliminar espacios

                      // Formatear columnas con números
                      if (column === 1) {
                        // Formato para español: Decimales con coma y miles con punto
                        data = data.replace(/[^\d,.-]/g, ""); // Eliminar caracteres no numéricos
                        if (data.includes(",")) {
                          // Asegurarse de que solo haya un separador decimal
                          const parts = data.split(",");
                          parts[0] = parts[0].replace(/[\.]/g, ""); // Eliminar puntos en la parte entera
                          data = parts.join("."); // Reconstruir con coma como separador decimal
                        } else {
                          data = data.replace(/[\.]/g, ""); // Eliminar puntos si no hay coma
                        }
                        return data; // Devolver dato formateado
                      }

                      // Formatear columnas con fechas
                      else if (column === 3 || column === 4) {
                        const arr = data.split(".");
                        if (arr.length === 3) {
                          return arr[0] + arr[1] + arr[2]; // Concatenar día, mes, año
                        } else if (arr.length === 2) {
                          return arr[0] + arr[1]; // Concatenar día y mes
                        } else if (arr.length === 1) {
                          return arr[0]; // Día solamente
                        }
                      }
                    }

                    return data; // Devolver dato original si no hay transformaciones
                  },
                },
              },
            },
          ],
          columnDefs: [
            {
              className: "dt-body-right",
              targets: [1],
            },
            {
              targets: 1,
              data: function (row, type, val, meta) {
                if (type === "set") {
                  row[meta.col] = val;
                  return;
                } else if (type === "display") {
                  return formatNumber(row[meta.col], 2);
                }
                return row[meta.col];
              },
            }, // decimales específicos ARS
          ],
          columns: [
            { data: "currency", title: "Currency" },
            {
              data: "total_security_position",
              title: "Total security positions",
              render: function (data, type, row, meta) {
                return formatNumber(data, 2);
              },
            },
          ],
        });
      } catch (error) {
        console.error(error);
      }
    });
  };

  valueHolding();

  const valueHoldingByCurrency = async () => {
    const URL =
      "https://api.latinsecurities.ar/v1_0/api/portfolio/holdings/consolidated-percentage/18baae5e-cb8b-405b-b962-d5591a0efb4d";
    await ensureToken();

    $("#loading-data-candaholding").on("click", async function () {
      $("#loading-data-candaholding").html(`
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
          throw new Error("HTTP error, status = " + response.status);
        }
        const data = await response.json();

        $("#loading-data-candaholding").hide();

        data.forEach((element) => {
          if (element.percentage !== null && element.percentage !== undefined) {
            element.percentage = element.percentage + "%";
          } else {
            element.percentage = "";
          }
        });

        $("#tableCandAHolding").dataTable({
          dom: "Bfrtip",
          autowidth: true,
          searching: true,
          info: true,
          scrollCollapse: true,
          pageLength: calcularNumeroElementosPorPagina(),
          data: data,
          buttons: [
            {
              extend: "excelHtml5",
            },
          ],
          columnDefs: [
            {
              className: "dt-body-right",
              targets: [2],
            },
          ],
          columns: [
            { data: "msg", title: "Message" },
            { data: "currency", title: "Currency" },
            {
              data: "percentage",
              title: "Percentaje",
            },
          ],
        });
      } catch (error) {
        console.error(error);
      }
    });
  };

  valueHoldingByCurrency();

  $("#loading-data-holding-for-graph").on("click", function () {
    $("#frmHoldingForGraph").dialog("open");
  });

  const paramsHoldingForGraph = $("#frmHoldingForGraph").dialog({
    title: "Datos",
    autoOpen: false,
    modal: true,
    width: 415,
    buttons: {
      CARGAR: async function () {
        $("#account_id").prop("disabled", true);
        $("#from_date").prop("disabled", true);

        const account_id = $("#account_id").val();
        const from_date = $("#from_date").val();

        const spinnerContainer = `
        <div id="spinnerContainer" style="display: flex; align-items: center; margin-right: 1rem;">
            <i class="fa fa-spinner fa-spin" style="font-size: 16px"></i>
            <p style="margin-left: 0.5rem; font-size: 16px; font-weight: 600">Cargando datos...</p>
        </div>
    `;
        const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
        buttonPane.css("display", "flex");
        buttonPane.css("justify-content", "flex-end");
        buttonPane.find("#spinnerContainer").remove(); // Eliminar cualquier spinner existente
        buttonPane.prepend(spinnerContainer);

        const holdingforgraph = async () => {
          controller = new AbortController();
          const signal = controller.signal;

          const URL = `https://api.latinsecurities.ar/v1_0/api/portfolio/holdings/graph?investment_account_id=${account_id}&from_date=${from_date}`;
          await ensureToken();
          try {
            const response = await fetch(URL, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accesToken}`,
                "Content-Type": "application/json",
              },
              signal: signal,
            });
            if (!response.ok) {
              throw new Error("HTTP error, status = " + response.status);
            }
            const data = await response.json();

            data.forEach((element) => {
              if (
                element.percentage !== null &&
                element.percentage !== undefined
              ) {
                element.percentage = element.percentage + "%";
              } else {
                element.percentage = "";
              }
            });

            if (!data || data.length === 0) {
              // Mostrar mensaje en el modal sin cerrarlo
              $("#spinnerContainer").empty().append(`
                <div style="display: flex; flex-direction: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <i class="fa fa-info-circle" style="font-size: 16px; color: orange;"></i>
                  <p style="margin-top: 0px; font-size: 16px; font-weight: 600; color: orange;">
                    Datos no encontrados.
                  </p>
                </div>
              `);
              $("#account_id").prop("disabled", false);
              $("#from_date").prop("disabled", false);
              buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
              return; // Salir de la función sin cerrar el modal
            }

            $("#tableHoldingForGraphInicial").DataTable().destroy();
            $("#tableHoldingForGraphInicial").remove();

            if ($.fn.dataTable.isDataTable("#tableholdingforgraph")) {
              const table = $("#tableholdingforgraph").DataTable();
              table.clear(); // Limpiar datos existentes
              table.rows.add(data); // Agregar los nuevos datos
              table.draw(); // Redibujar la tabla
            } else {
              $("#tableholdingforgraph").dataTable({
                dom: "Bfrtip",
                autoWidth: true,
                scrollCollapse: true,
                pageLength: calcularNumeroElementosPorPagina(),
                data: data,
                buttons: [
                  {
                    text: "Cargar datos",
                    action: function (e, dt, node, config) {
                      paramsHoldingForGraph.dialog("open");
                    },
                  },
                  {
                    extend: "excelHtml5",
                    customize: function (xlsx) {
                      var sheet = xlsx.xl.worksheets["sheet1.xml"];

                      // Aplicar estilo existente (ejemplo: 64)
                      $('row c[r^="B"]', sheet).attr("s", "64"); // Números normales
                      $('row c[r^="C"]', sheet).attr("s", "64"); // Números normales
                    },
                    exportOptions: {
                      format: {
                        body: function (data, row, column, node) {
                          // Verificar si el dato es válido y convertirlo a cadena
                          if (typeof data !== "undefined" && data !== null) {
                            data = String(data).trim(); // Convertir a cadena y eliminar espacios

                            // Formatear columnas con números
                            if (column === 1 || column === 2) {
                              // Formato para español: Decimales con coma y miles con punto
                              data = data.replace(/[^\d,.-]/g, ""); // Eliminar caracteres no numéricos
                              if (data.includes(",")) {
                                // Asegurarse de que solo haya un separador decimal
                                const parts = data.split(",");
                                parts[0] = parts[0].replace(/[\.]/g, ""); // Eliminar puntos en la parte entera
                                data = parts.join("."); // Reconstruir con coma como separador decimal
                              } else {
                                data = data.replace(/[\.]/g, ""); // Eliminar puntos si no hay coma
                              }
                              return data; // Devolver dato formateado
                            }

                            // Formatear columnas con fechas
                            else if (column === 3 || column === 4) {
                              const arr = data.split(".");
                              if (arr.length === 3) {
                                return arr[0] + arr[1] + arr[2]; // Concatenar día, mes, año
                              } else if (arr.length === 2) {
                                return arr[0] + arr[1]; // Concatenar día y mes
                              } else if (arr.length === 1) {
                                return arr[0]; // Día solamente
                              }
                            }
                          }

                          return data; // Devolver dato original si no hay transformaciones
                        },
                      },
                    },
                  },
                ],
                columnDefs: [
                  {
                    className: "dt-body-right",
                    targets: [1, 2, 3],
                  },
                  {
                    targets: 1,
                    data: function (row, type, val, meta) {
                      if (type === "set") {
                        row[meta.col] = val;
                        return;
                      } else if (type === "display") {
                        return formatNumber(row[meta.col], 2);
                      }
                      return row[meta.col];
                    },
                  }, // decimales específicos ARS
                ],
                columns: [
                  {
                    data: "instrument_description",
                    title: "Instrument description",
                  },
                  {
                    data: "amount",
                    title: "Amount",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "price",
                    title: "Price",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "percentage",
                    title: "Percentaje",
                  },
                  { data: "instrument_type", title: "Instrument type" },
                ],
              });
            }
          } catch (error) {
            console.error(error);
          }
        };

        try {
          await holdingforgraph(account_id, from_date);
        } catch (error) {
          console.error("Error al obtener los datos:", error);
        } finally {
          if (
            !$("#spinnerContainer")
              .find("p")
              .text()
              .includes("Datos no encontrados")
          ) {
            $("#spinnerContainer").hide();
            paramsHoldingForGraph.dialog("close");
            $("#loading-data-holding-for-graph").hide();
          }
        }
      },
      CANCELAR: function () {
        paramsHoldingForGraph.dialog("close");
        $("#spinnerContainer").remove();
        $("#account_id").prop("disabled", false);
        $("#from_date").prop("disabled", false);
        buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
        controller.abort();
      },
    },
    close: function () {
      $("#spinnerContainer").remove();
      $("#account_id").prop("disabled", false);
      $("#from_date").prop("disabled", false);
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
    },
  });

  // ----- HOLDING FIN -----

  // ----- CURRENCIES INICIO -----

  const investmentAccount = async () => {
    const URL =
      "https://api.latinsecurities.ar/v1_0/api/portfolio/currencies/total/18baae5e-cb8b-405b-b962-d5591a0efb4d";
    $("#loading-data-portafolio-currencies").on("click", async function () {
      $("#loading-data-portafolio-currencies").html(`
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
        console.log(data);

        $("#loading-data-portafolio-currencies").hide();

        $("#tablePortafolioCurrencies").dataTable({
          dom: "Bfrtip",
          autowidth: true,
          scrollCollapse: true,
          pageLength: calcularNumeroElementosPorPagina(),
          data: data,
          buttons: [
            {
              extend: "excelHtml5",
              customize: function (xlsx) {
                var sheet = xlsx.xl.worksheets["sheet1.xml"];

                // Aplicar estilo existente (ejemplo: 64)
                $('row c[r^="B"]', sheet).attr("s", "64"); // Números normales
              },
              exportOptions: {
                format: {
                  body: function (data, row, column, node) {
                    // Verificar si el dato es válido y convertirlo a cadena
                    if (typeof data !== "undefined" && data !== null) {
                      data = String(data).trim(); // Convertir a cadena y eliminar espacios

                      // Formatear columnas con números
                      if (column === 1) {
                        // Formato para español: Decimales con coma y miles con punto
                        data = data.replace(/[^\d,.-]/g, ""); // Eliminar caracteres no numéricos
                        if (data.includes(",")) {
                          // Asegurarse de que solo haya un separador decimal
                          const parts = data.split(",");
                          parts[0] = parts[0].replace(/[\.]/g, ""); // Eliminar puntos en la parte entera
                          data = parts.join("."); // Reconstruir con coma como separador decimal
                        } else {
                          data = data.replace(/[\.]/g, ""); // Eliminar puntos si no hay coma
                        }
                        return data; // Devolver dato formateado
                      }

                      // Formatear columnas con fechas
                      else if (column === 3 || column === 4) {
                        const arr = data.split(".");
                        if (arr.length === 3) {
                          return arr[0] + arr[1] + arr[2]; // Concatenar día, mes, año
                        } else if (arr.length === 2) {
                          return arr[0] + arr[1]; // Concatenar día y mes
                        } else if (arr.length === 1) {
                          return arr[0]; // Día solamente
                        }
                      }
                    }

                    return data; // Devolver dato original si no hay transformaciones
                  },
                },
              },
            },
          ],
          deferRender: true,
          columnDefs: [
            {
              className: "dt-body-right",
              targets: [1],
            },
            {
              targets: 1,
              data: function (row, type, val, meta) {
                if (type === "set") {
                  row[meta.col] = val;
                  return;
                } else if (type === "display") {
                  return formatNumber(row[meta.col], 2);
                }
                return row[meta.col];
              },
            }, // decimales específicos ARS
          ],
          columns: [
            { data: "currency", title: "Currency" },
            {
              data: "total_currency_position",
              title: "Total currency position",
              render: function (data, type, row, meta) {
                return formatNumber(data, 2);
              },
            },
          ],
        });
      } catch (error) {
        console.log(error);
      }
    });
  };
  investmentAccount();

  const availablecurrentPositions = async () => {
    const URL =
      "https://api.latinsecurities.ar/v1_0/api/portfolio/currencies/major-position/18baae5e-cb8b-405b-b962-d5591a0efb4d";

    $("#loading-data-available-currencies").on("click", async function () {
      $("#loading-data-available-currencies").html(`
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
        const data = await response.json();
        console.log(data);

        $("#loading-data-available-currencies").hide();

        var table = $("#tableAvailableCurrenciespositions").dataTable({
          data: data, // Asigna los datos obtenidos de la API
          paging: true,
          searching: true,
          ordering: true,
          autowidth: true,
          pageLength: calcularNumeroElementosPorPagina(),
          responsive: false,
          info: true,
          scrollX: true,
          scrollCollapse: true,
          scrollY: "62dvh",
          dom: "Bfrtip",
          buttons: [
            {
              extend: "excelHtml5",
              customize: function (xlsx) {
                var sheet = xlsx.xl.worksheets["sheet1.xml"];

                // Aplicar estilo existente (ejemplo: 64)
                $('row c[r^="B"]', sheet).attr("s", "64"); // Números normales
              },
              exportOptions: {
                format: {
                  body: function (data, row, column, node) {
                    // Verificar si el dato es válido y convertirlo a cadena
                    if (typeof data !== "undefined" && data !== null) {
                      data = String(data).trim(); // Convertir a cadena y eliminar espacios

                      // Formatear columnas con números
                      if (column === 1) {
                        // Formato para español: Decimales con coma y miles con punto
                        data = data.replace(/[^\d,.-]/g, ""); // Eliminar caracteres no numéricos
                        if (data.includes(",")) {
                          // Asegurarse de que solo haya un separador decimal
                          const parts = data.split(",");
                          parts[0] = parts[0].replace(/[\.]/g, ""); // Eliminar puntos en la parte entera
                          data = parts.join("."); // Reconstruir con coma como separador decimal
                        } else {
                          data = data.replace(/[\.]/g, ""); // Eliminar puntos si no hay coma
                        }
                        return data; // Devolver dato formateado
                      }

                      // Formatear columnas con fechas
                      else if (column === 3 || column === 4) {
                        const arr = data.split(".");
                        if (arr.length === 3) {
                          return arr[0] + arr[1] + arr[2]; // Concatenar día, mes, año
                        } else if (arr.length === 2) {
                          return arr[0] + arr[1]; // Concatenar día y mes
                        } else if (arr.length === 1) {
                          return arr[0]; // Día solamente
                        }
                      }
                    }

                    return data; // Devolver dato original si no hay transformaciones
                  },
                },
              },
            },
          ],
          columnDefs: [
            {
              className: "dt-body-right",
              targets: [1],
            },
            {
              targets: 1,
              data: function (row, type, val, meta) {
                if (type === "set") {
                  row[meta.col] = val;
                  return;
                } else if (type === "display") {
                  return formatNumber(row[meta.col], 2);
                }
                return row[meta.col];
              },
            }, // decimales específicos ARS
          ],
          columns: [
            {
              data: "investment_account_number",
              title: "Investment account number",
            },
            {
              data: "available",
              title: "Available",
              render: function (data, type, row, meta) {
                return formatNumber(data, 2);
              },
            },
          ],
        });
        table.columns.adjust().draw(false);
      } catch (error) {
        console.error(error);
      }
    });
  };
  availablecurrentPositions();

  const currenciesPositions = async () => {
    const URL =
      "https://api.latinsecurities.ar/v1_0/api/portfolio/currencies/18baae5e-cb8b-405b-b962-d5591a0efb4d";

    $("#loading-data-currencies").on("click", async function () {
      $("#loading-data-currencies").html(`
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
        const data = await response.json();

        $("#loading-data-currencies").hide();

        $("#tableCurrenciespositions").dataTable({
          data: data["555"].position,
          dom: "Bfrtip",
          autowidth: true,
          scrollCollapse: true,
          pageLength: calcularNumeroElementosPorPagina(),
          buttons: [
            {
              extend: "excelHtml5",
              customize: function (xlsx) {
                var sheet = xlsx.xl.worksheets["sheet1.xml"];

                // Aplicar estilo existente (ejemplo: 64)
                $('row c[r^="B"]', sheet).attr("s", "64"); // Números normales
              },
              exportOptions: {
                format: {
                  body: function (data, row, column, node) {
                    // Verificar si el dato es válido y convertirlo a cadena
                    if (typeof data !== "undefined" && data !== null) {
                      data = String(data).trim(); // Convertir a cadena y eliminar espacios

                      // Formatear columnas con números
                      if (column === 1) {
                        // Formato para español: Decimales con coma y miles con punto
                        data = data.replace(/[^\d,.-]/g, ""); // Eliminar caracteres no numéricos
                        if (data.includes(",")) {
                          // Asegurarse de que solo haya un separador decimal
                          const parts = data.split(",");
                          parts[0] = parts[0].replace(/[\.]/g, ""); // Eliminar puntos en la parte entera
                          data = parts.join("."); // Reconstruir con coma como separador decimal
                        } else {
                          data = data.replace(/[\.]/g, ""); // Eliminar puntos si no hay coma
                        }
                        return data; // Devolver dato formateado
                      }

                      // Formatear columnas con fechas
                      else if (column === 3 || column === 4) {
                        const arr = data.split(".");
                        if (arr.length === 3) {
                          return arr[0] + arr[1] + arr[2]; // Concatenar día, mes, año
                        } else if (arr.length === 2) {
                          return arr[0] + arr[1]; // Concatenar día y mes
                        } else if (arr.length === 1) {
                          return arr[0]; // Día solamente
                        }
                      }
                    }

                    return data; // Devolver dato original si no hay transformaciones
                  },
                },
              },
            },
          ],
          columnDefs: [
            {
              className: "dt-body-right",
              targets: [1],
            },
            {
              targets: 1,
              data: function (row, type, val, meta) {
                if (type === "set") {
                  row[meta.col] = val;
                  return;
                } else if (type === "display") {
                  return formatNumber(row[meta.col], 2);
                }
                return row[meta.col];
              },
            }, // decimales específicos ARS
          ],
          columns: [
            { data: "currency", title: "Currency" },
            {
              data: "currency_position",
              title: "Currency position",
              render: function (data, type, row, meta) {
                return formatNumber(data, 2);
              },
            },
          ],
        });
      } catch (error) {
        console.error(error);
      }
    });
  };
  currenciesPositions();

  // ----- CURRENCIES FIN -----

  // ----- TREASURY INICIO -----

  $("#loading-data-movements").on("click", function () {
    $("#parametrosMovements").dialog("open");
  });

  const parametrosMovements = $("#parametrosMovements").dialog({
    title: "Datos",
    autoOpen: false,
    modal: true,
    width: 415,
    height: "auto",
    buttons: {
      CARGAR: async function () {
        $("#desdeDate").prop("disabled", true);
        $("#hastaDate").prop("disabled", true);

        if (
          !$(
            "#parametrosMovements input[name='to_date'], #parametrosMovements input[name='from_date']"
          ).valid()
        ) {
          return;
        }
        const start_date = $("#desdeDate").val();
        const end_date = $("#hastaDate").val();

        const spinnerContainer = `
        <div id="spinnerContainer" style="display: flex; align-items: center; margin-right: 1rem;">
            <i class="fa fa-spinner fa-spin" style="font-size: 16px"></i>
            <p style="margin-left: 0.5rem; font-size: 16px; font-weight: 600">Cargando datos...</p>
        </div>
    `;
        const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
        buttonPane.css("display", "flex");
        buttonPane.css("justify-content", "flex-end");
        buttonPane.find("#spinnerContainer").remove(); // Eliminar cualquier spinner existente
        buttonPane.find("button").prop("disabled", true); // Desactivar todos los botones
        buttonPane.prepend(spinnerContainer);

        const treasuryMovement = async () => {
          controller = new AbortController();
          const signal = controller.signal;
          const URL = `https://api.latinsecurities.ar/v1_0/api/portfolio/treasure/movements/18baae5e-cb8b-405b-b962-d5591a0efb4d?start_date=${start_date}&end_date=${end_date}&page=1&filter_by_investment_account=&filter_by_name=&filter_by_cuitcuil=`;
          try {
            const response = await fetch(URL, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accesToken}`,
                "Content-Type": "application/json",
              },
              signal: signal,
            });
            const data = await response.json();
            console.log(data);

            if (!data || data.length === 0) {
              // Mostrar mensaje en el modal sin cerrarlo
              $("#spinnerContainer").empty().append(`
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <i class="fa fa-info-circle" style="font-size: 16px; color: orange;"></i>
                  <p style="margin-top: 0px; font-size: 16px; font-weight: 600; color: orange;">
                    Datos no encontrados.
                  </p>
                </div>
              `);
              $("#desdeDate").prop("disabled", false);
              $("#hastaDate").prop("disabled", false);
              buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
              return; // Salir de la función sin cerrar el modal
            }

            $("#tableMovementsInicial").dataTable().fnDestroy();
            $("#tableMovementsInicial").remove();

            if ($.fn.dataTable.isDataTable("#tableMovements")) {
              const table = $("#tableMovements").DataTable();
              table.clear();
              table.rows.add(data);
              table.draw();
            } else {
              $("#tableMovements").dataTable({
                data: data,
                dom: "Bfrtip",
                autowidth: true,
                scrollX: true,
                buttons: [
                  {
                    text: "Cargar datos",
                    action: function (e, dt, node, config) {
                      parametrosMovements.dialog("open");
                    },
                  },
                  {
                    extend: "excelHtml5",
                    customize: function (xlsx) {
                      var sheet = xlsx.xl.worksheets["sheet1.xml"];

                      // Aplicar estilo existente (ejemplo: 64)
                      $('row c[r^="I"]', sheet).attr("s", "64"); // Números normales
                    },
                    exportOptions: {
                      format: {
                        body: function (data, row, column, node) {
                          // Verificar si el dato es válido y convertirlo a cadena
                          if (typeof data !== "undefined" && data !== null) {
                            data = String(data).trim(); // Convertir a cadena y eliminar espacios

                            // Formatear columnas con números
                            if (column === 8) {
                              // Formato para español: Decimales con coma y miles con punto
                              data = data.replace(/[^\d,.-]/g, ""); // Eliminar caracteres no numéricos
                              if (data.includes(",")) {
                                // Asegurarse de que solo haya un separador decimal
                                const parts = data.split(",");
                                parts[0] = parts[0].replace(/[\.]/g, ""); // Eliminar puntos en la parte entera
                                data = parts.join("."); // Reconstruir con coma como separador decimal
                              } else {
                                data = data.replace(/[\.]/g, ""); // Eliminar puntos si no hay coma
                              }
                              return data; // Devolver dato formateado
                            }

                            // Formatear columnas con fechas
                            else if (column === 0) {
                              const arr = data.split(".");
                              if (arr.length === 3) {
                                return arr[0] + arr[1] + arr[2]; // Concatenar día, mes, año
                              } else if (arr.length === 2) {
                                return arr[0] + arr[1]; // Concatenar día y mes
                              } else if (arr.length === 1) {
                                return arr[0]; // Día solamente
                              }
                            }
                          }

                          return data; // Devolver dato original si no hay transformaciones
                        },
                      },
                    },
                  },
                ],
                columnDefs: [
                  {
                    className: "dt-body-right",
                    targets: [8],
                  },
                  {
                    targets: 1,
                    data: function (row, type, val, meta) {
                      if (type === "set") {
                        row[meta.col] = val;
                        return;
                      } else if (type === "display") {
                        return formatNumber(row[meta.col], 2);
                      }
                      return row[meta.col];
                    },
                  }, // decimales específicos ARS
                ],
                columns: [
                  {
                    data: "concertation_date",
                    title: "Concertation date",
                    render: function (data) {
                      return formatDate(data);
                    },
                  },
                  {
                    data: "cuit_cuil",
                    title: "CUIT/CUIL",
                  },
                  {
                    data: "client",
                    title: "Client",
                  },
                  {
                    data: "account_number",
                    title: "Account number",
                  },
                  { data: "movement_type", title: "Movement type" },
                  { data: "bank_origin", title: "Bank origin" },
                  { data: "currency", title: "Currency" },
                  { data: "currency_symbol", title: "Currency symbol" },
                  {
                    data: "ammount",
                    title: "Amount",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  { data: "bank_destiny", title: "Bank destiny" },
                  { data: "cbu", title: "CBU" },
                  { data: "hour", title: "Hour" },
                ],
              });
            }
          } catch (error) {
            console.error(error);
          }
        };
        try {
          await treasuryMovement(start_date, end_date);
        } catch (error) {
          console.error("Error al obtener los datos", error);
        } finally {
          if (
            !$("#spinnerContainer")
              .find("p")
              .text()
              .includes("Datos no encontrados")
          ) {
            $("#spinnerContainer").hide();
            parametrosMovements.dialog("close");
            $("#loading-data-movements").hide();
          }
        }
      },
      CANCELAR: function () {
        parametrosMovements.dialog("close");
        $("#parametrosMovements form").validate().resetForm(); // Restablecer las validaciones
        $("#parametrosMovements input").attr("placeholder", ""); // retablecer los placeholders
        $("#spinnerContainer").remove();
        $("#desdeDate").prop("disabled", false);
        $("#hastaDate").prop("disabled", false);
        buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
        controller.abort();
      },
    },
    close: function () {
      $("#spinnerContainer").remove();
      $("#parametrosMovements form").validate().resetForm(); // Restablecer las validaciones
      $("#parametrosMovements input").attr("placeholder", ""); // retablecer los placeholders
      $("#desdeDate").prop("disabled", false);
      $("#hastaDate").prop("disabled", false);
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
    },
  });

  $("#loading-data-movements-deposit").on("click", function () {
    $("#parametrosMovementsDeposit").dialog("open");
  });
  const parametrosMovementsDeposit = $("#parametrosMovementsDeposit").dialog({
    title: "Datos",
    autoOpen: false,
    modal: true,
    width: 415,
    height: "auto",
    buttons: {
      CARGAR: async function () {
        $("#desdeDataDeposit").prop("disabled", true);
        $("#hastaDateDeposit").prop("disabled", true);

        if (
          !$(
            "#parametrosMovementsDeposit input[name='to_date'], #parametrosMovementsDeposit input[name='from_date']"
          ).valid()
        ) {
          return;
        }
        const spinnerContainer = `
        <div id="spinnerContainer" style="display: flex; align-items: center; margin-right: 1rem;">
            <i class="fa fa-spinner fa-spin" style="font-size: 16px"></i>
            <p style="margin-left: 0.5rem; font-size: 16px; font-weight: 600">Cargando datos...</p>
        </div>
    `;
        const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
        buttonPane.css("display", "flex");
        buttonPane.css("justify-content", "flex-end");
        buttonPane.find("#spinnerContainer").remove(); // Eliminar cualquier spinner existente
        buttonPane.prepend(spinnerContainer);

        const start_date = $("#desdeDataDeposit").val();
        const end_date = $("#hastaDateDeposit").val();

        const MovementDeposit = async () => {
          controller = new AbortController();
          const signal = controller.signal;

          const URL = `https://api.latinsecurities.ar/v1_0/api/portfolio/treasure/movements/deposits/18baae5e-cb8b-405b-b962-d5591a0efb4d?start_date=${start_date}&end_date=${end_date}&page=1&filter_by_investment_account=&filter_by_name=&filter_by_cuitcuil=`;

          try {
            const response = await fetch(URL, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accesToken}`,
                "Content-Type": "application/json",
              },
              signal: signal,
            });
            const data = await response.json();
            console.log(data);

            if (!data || data.length === 0) {
              // Mostrar mensaje en el modal sin cerrarlo
              $("#spinnerContainer").empty().append(`
                <div style="display: flex; flex-direction: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <i class="fa fa-info-circle" style="font-size: 16px; color: orange;"></i>
                  <p style="margin-top: 0px; font-size: 16px; font-weight: 600; color: orange;">
                    Datos no encontrados.
                  </p>
                </div>
              `);
              $("#desdeDataDeposit").prop("disabled", false);
              $("#hastaDateDeposit").prop("disabled", false);
              buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
              return; // Salir de la función sin cerrar el modal
            }

            $("#tableMovementsDepositInicial").dataTable().fnDestroy();
            $("#tableMovementsDepositInicial").remove();

            if ($.fn.dataTable.isDataTable("#tableMovementsDeposit")) {
              const table = $("#tableMovementsDeposit").DataTable();
              table.clear();
              table.rows.add(data);
              table.draw();
            } else {
              $("#tableMovementsDeposit").dataTable({
                data: data,
                dom: "Bfrtip",
                autowidth: true,
                scrollX: true,
                buttons: [
                  {
                    text: "Cargar datos",
                    action: function (e, dt, node, config) {
                      parametrosMovementsDeposit.dialog("open");
                    },
                  },
                  {
                    extend: "excelHtml5",
                    exportOptions: {
                      format: {
                        body: function (data, row, column, node) {
                          // Verificar si el dato es válido y convertirlo a cadena
                          if (typeof data !== "undefined" && data !== null) {
                            data = String(data).trim(); // Convertir a cadena y eliminar espacios

                            // Formatear columnas con números
                            if (column === NaN) {
                              // Formato para español: Decimales con coma y miles con punto
                              data = data.replace(/[^\d,.-]/g, ""); // Eliminar caracteres no numéricos
                              if (data.includes(",")) {
                                // Asegurarse de que solo haya un separador decimal
                                const parts = data.split(",");
                                parts[0] = parts[0].replace(/[\.]/g, ""); // Eliminar puntos en la parte entera
                                data = parts.join("."); // Reconstruir con coma como separador decimal
                              } else {
                                data = data.replace(/[\.]/g, ""); // Eliminar puntos si no hay coma
                              }
                              return data; // Devolver dato formateado
                            }

                            // Formatear columnas con fechas
                            else if (column === 0) {
                              const arr = data.split(".");
                              if (arr.length === 3) {
                                return arr[0] + arr[1] + arr[2]; // Concatenar día, mes, año
                              } else if (arr.length === 2) {
                                return arr[0] + arr[1]; // Concatenar día y mes
                              } else if (arr.length === 1) {
                                return arr[0]; // Día solamente
                              }
                            }
                          }

                          return data; // Devolver dato original si no hay transformaciones
                        },
                      },
                    },
                  },
                ],
                columnDefs: [
                  {
                    className: "dt-body-right",
                    targets: [8],
                  },
                  {
                    targets: 1,
                    data: function (row, type, val, meta) {
                      if (type === "set") {
                        row[meta.col] = val;
                        return;
                      } else if (type === "display") {
                        return formatNumber(row[meta.col], 2);
                      }
                      return row[meta.col];
                    },
                  }, // decimales específicos ARS
                ],
                columns: [
                  {
                    data: "concertation_date",
                    title: "Concertation date",
                    render: function (data) {
                      return formatDate(data);
                    },
                  },
                  {
                    data: "cuit_cuil",
                    title: "CUIT/CUIL",
                  },
                  { data: "client", title: "Client" },
                  {
                    data: "account_number",
                    title: "Account number",
                  },
                  { data: "movement_type", title: "Movement type" },
                  { data: "bank_origin", title: "Bank origin" },
                  { data: "currency", title: "Currency" },
                  { data: "currency_symbol", title: "Currency symbol" },
                  {
                    data: "ammount",
                    title: "Amount",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  { data: "bank_destiny", title: "Bank destiny" },
                  { data: "cbu", title: "CBU" },
                  { data: "hour", title: "Hour" },
                ],
              });
            }
          } catch (error) {
            console.error(error);
          }
        };

        try {
          await MovementDeposit(start_date, end_date);
        } catch (error) {
          console.error("Error al obtener los datos", error);
        } finally {
          if (
            !$("#spinnerContainer")
              .find("p")
              .text()
              .includes("Datos no encontrados")
          ) {
            $("#spinnerContainer").remove();
            parametrosMovementsDeposit.dialog("close");
            $("#loading-data-movements-deposit").hide();
          }
        }
      },
      CANCELAR: function () {
        parametrosMovementsDeposit.dialog("close");
        $("#spinnerContainer").hide();
        $("#parametrosMovementsDeposit form").validate().resetForm(); // Restablecer las validaciones
        $("#parametrosMovementsDeposit input").attr("placeholder", ""); // retablecer los placeholders
        $("#desdeDataDeposit").prop("disabled", false);
        $("#hastaDateDeposit").prop("disabled", false);
        buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
        controller.abort();
      },
    },
    close: function () {
      $("#spinnerContainer").remove();
      $("#parametrosMovementsDeposit form").validate().resetForm(); // Restablecer las validaciones
      $("#parametrosMovementsDeposit input").attr("placeholder", ""); // retablecer los placeholders
      $("#desdeDataDeposit").prop("disabled", false);
      $("#hastaDateDeposit").prop("disabled", false);
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
    },
  });

  // ----- TREASURY FIN -----

  $("#loading-data-total-investment-account").on("click", function () {
    $("#totalInvestmentAccountModal").dialog("open");
  });
  const totalInvestmentAccountModal = $("#totalInvestmentAccountModal").dialog({
    title: "Cargar datos",
    autoOpen: false,
    modal: true,
    width: 415,
    buttons: {
      CARGAR: async function () {
        $("#accountInvestmentTotal").prop("disabled", true);

        if (!$("#totalInvestmentAccountModal input[name='account']").valid()) {
          return;
        }
        const account_id = $("#accountInvestmentTotal").val();

        const spinnerContainer = `
        <div id="spinnerContainer" style="display: flex; align-items: center; margin-right: 1rem;">
            <i class="fa fa-spinner fa-spin" style="font-size: 16px"></i>
            <p style="margin-left: 0.5rem; font-size: 16px; font-weight: 600">Cargando datos...</p>
        </div>
      `;
        const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
        buttonPane.css("display", "flex");
        buttonPane.css("justify-content", "flex-end");
        buttonPane.find("#spinnerContainer").remove(); // Eliminar cualquier spinner existente}
        buttonPane.find("button").prop("disabled", true); // Desactivar todos los botones
        buttonPane.prepend(spinnerContainer);

        const totalInvestmentAccount = async () => {
          controller = new AbortController();
          const signal = controller.signal;

          const URL = `https://api.latinsecurities.ar/v1_0/api/portfolio/portfolio/18baae5e-cb8b-405b-b962-d5591a0efb4d/investment-account/total?investment_account_id=${account_id}`;
          try {
            const response = await fetch(URL, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accesToken}`,
                "Content-Type": "application/json",
              },
              signal: signal,
            });
            const data = await response.json();
            console.log(data);

            if (!data || data.length === 0) {
              // Mostrar mensaje en el modal sin cerrarlo
              $("#spinnerContainer").empty().append(`
                <div style="display: flex; flex-direction: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <i class="fa fa-info-circle" style="font-size: 16px; color: orange;"></i>
                  <p style="margin-top: 0px; font-size: 16px; font-weight: 600; color: orange;">
                    Datos no encontrados.
                  </p>
                </div>
              `);
              $("#accountInvestmentTotal").prop("disabled", false);
              buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
              return; // Salir de la función sin cerrar el modal
            }

            $("#tableTotalInvestmentAccountInicial").dataTable().fnDestroy();
            $("#tableTotalInvestmentAccountInicial").remove();

            if ($.fn.dataTable.isDataTable("#tableTotalInvestmentAccount")) {
              const table = $("#tableTotalInvestmentAccount").DataTable();
              table.clear();
              table.rows.add(data);
              table.draw();
            } else {
              $("#tableTotalInvestmentAccount").dataTable({
                data: data,
                dom: "Bfrtip",
                autowidth: true,
                buttons: [
                  {
                    text: "Cargar datos",
                    action: function (e, dt, node, config) {
                      totalInvestmentAccountModal.dialog("open");
                    },
                  },
                  {
                    extend: "excelHtml5",
                    customize: function (xlsx) {
                      var sheet = xlsx.xl.worksheets["sheet1.xml"];

                      // Aplicar estilo existente (ejemplo: 64)
                      $('row c[r^="B"]', sheet).attr("s", "64"); // Números normales
                    },
                    exportOptions: {
                      format: {
                        body: function (data, row, column, node) {
                          // Verificar si el dato es válido y convertirlo a cadena
                          if (typeof data !== "undefined" && data !== null) {
                            data = String(data).trim(); // Convertir a cadena y eliminar espacios

                            // Formatear columnas con números
                            if (column === 1) {
                              // Formato para español: Decimales con coma y miles con punto
                              data = data.replace(/[^\d,.-]/g, ""); // Eliminar caracteres no numéricos
                              if (data.includes(",")) {
                                // Asegurarse de que solo haya un separador decimal
                                const parts = data.split(",");
                                parts[0] = parts[0].replace(/[\.]/g, ""); // Eliminar puntos en la parte entera
                                data = parts.join("."); // Reconstruir con coma como separador decimal
                              } else {
                                data = data.replace(/[\.]/g, ""); // Eliminar puntos si no hay coma
                              }
                              return data; // Devolver dato formateado
                            }

                            // Formatear columnas con fechas
                            else if (column === NaN || column === NaN) {
                              const arr = data.split(".");
                              if (arr.length === 3) {
                                return arr[0] + arr[1] + arr[2]; // Concatenar día, mes, año
                              } else if (arr.length === 2) {
                                return arr[0] + arr[1]; // Concatenar día y mes
                              } else if (arr.length === 1) {
                                return arr[0]; // Día solamente
                              }
                            }
                          }

                          return data; // Devolver dato original si no hay transformaciones
                        },
                      },
                    },
                  },
                ],
                columnDefs: [
                  {
                    className: "dt-body-right",
                    targets: [1],
                  },
                  {
                    targets: 1,
                    data: function (row, type, val, meta) {
                      if (type === "set") {
                        row[meta.col] = val;
                        return;
                      } else if (type === "display") {
                        return formatNumber(row[meta.col], 2);
                      }
                      return row[meta.col];
                    },
                  }, // decimales específicos ARS
                ],
                columns: [
                  {
                    data: "investment_account_id",
                    title: "Investement account id",
                  },
                  {
                    data: "amount",
                    title: "Amount",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  { data: "balance_type", title: "Balance type" },
                ],
              });
            }
          } catch (error) {
            console.error(error);
          }
        };

        try {
          await totalInvestmentAccount(account_id);
        } catch (error) {
          console.error("Error al obtener los datos", error);
        } finally {
          if (
            !$("#spinnerContainer")
              .find("p")
              .text()
              .includes("Datos no encontrados")
          ) {
            $("#spinnerContainer").remove();
            totalInvestmentAccountModal.dialog("close");
            $("#loading-data-total-investment-account").hide();
          }
        }
      },
      CANCELAR: function () {
        totalInvestmentAccountModal.dialog("close");
        $("spinnerContainer").remove();
        $("#totalInvestmentAccountModal form").validate().resetForm(); // Restablecer las validaciones
        $("#totalInvestmentAccountModal input").attr("placeholder", ""); // retablecer los placeholders
        $("#accountInvestmentTotal").prop("disabled", false);
        buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
        controller.abort();
      },
    },
    close: function () {
      $("#spinnerContainer").remove();
      $("#totalInvestmentAccountModal form").validate().resetForm(); // Restablecer las validaciones
      $("#totalInvestmentAccountModal input").attr("placeholder", ""); // retablecer los placeholders
      $("#accountInvestmentTotal").prop("disabled", false);
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
    },
  });

  $("#loading-data-resumen").on("click", function () {
    $("#modalResumen").dialog("open");
  });
  const modalResumen = $("#modalResumen").dialog({
    autoOpen: false,
    modal: true,
    title: "Datos",
    height: "auto",
    width: 415,
    buttons: {
      CARGAR: async function () {
        $("#resumenAccount").prop("disabled", true);

        if (!$("#modalResumen input[name='account']").valid()) {
          return;
        }
        const spinnerContainer = `
            <div id="spinnerContainer" style="display: flex; align-items: center; margin-right: 1rem;">
                <i class="fa fa-spinner fa-spin" style="font-size: 16px"></i>
                <p style="margin-left: 0.5rem; font-size: 16px; font-weight: 600">Cargando datos...</p>
            </div>
        `;
        const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
        buttonPane.css("display", "flex");
        buttonPane.css("justify-content", "flex-end");
        buttonPane.find("#spinnerContainer").remove(); // Eliminar cualquier spinner existente
        buttonPane.find("button").prop("disabled", true); // Desactivar todos los botones
        buttonPane.prepend(spinnerContainer);

        const account_id = $("#resumenAccount").val();
        const PorfolioResume = async () => {
          controller = new AbortController();
          const signal = controller.signal;

          const URL = `https://api.latinsecurities.ar/v1_0/api/portfolio/portfolio/resume/18baae5e-cb8b-405b-b962-d5591a0efb4d?investment_account_id=${account_id}&client_name=&page=1`;

          try {
            const response = await fetch(URL, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accesToken}`,
                "Content-Type": "application/json",
              },
              signal: signal,
            });
            const data = await response.json();

            if (!data || data.length === 0) {
              // Mostrar mensaje en el modal sin cerrarlo
              $("#spinnerContainer").empty().append(`
                <div style="display: flex; flex-direction: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <i class="fa fa-info-circle" style="font-size: 16px; color: orange;"></i>
                  <p style="margin-top: 0px; font-size: 16px; font-weight: 600; color: orange;">
                    Datos no encontrados.
                  </p>
                </div>
              `);
              $("#resumenAccount").prop("disabled", false);
              buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
              return; // Salir de la función sin cerrar el modal
            }

            if ($.fn.dataTable.isDataTable("#tableResume")) {
              const table = $("#tableResume").DataTable();
              table.clear();
              table.rows.add(data);
              table.draw();
            } else {
              $("#tableResume").dataTable({
                dom: "Bfrtip",
                data: data,
                autowidth: true,
                buttons: [
                  {
                    text: "Cargar datos",
                    action: function (e, dt, node, config) {
                      modalResumen.dialog("open");
                    },
                  },
                  {
                    extend: "excelHtml5",
                    customize: function (xlsx) {
                      var sheet = xlsx.xl.worksheets["sheet1.xml"];

                      // Aplicar estilo existente (ejemplo: 64)
                      $('row c[r^="B"]', sheet).attr("s", "64"); // Números normales
                      $('row c[r^="C"]', sheet).attr("s", "64"); // Números normales
                      $('row c[r^="E"]', sheet).attr("s", "64"); // Números normales
                      $('row c[r^="F"]', sheet).attr("s", "64"); // Números normales
                    },
                    exportOptions: {
                      format: {
                        body: function (data, row, column, node) {
                          // Verificar si el dato es válido y convertirlo a cadena
                          if (typeof data !== "undefined" && data !== null) {
                            data = String(data).trim(); // Convertir a cadena y eliminar espacios

                            // Formatear columnas con números
                            if (
                              column === 1 ||
                              column === 2 ||
                              column === 4 ||
                              column === 5
                            ) {
                              // Formato para español: Decimales con coma y miles con punto
                              data = data.replace(/[^\d,.-]/g, ""); // Eliminar caracteres no numéricos
                              if (data.includes(",")) {
                                // Asegurarse de que solo haya un separador decimal
                                const parts = data.split(",");
                                parts[0] = parts[0].replace(/[\.]/g, ""); // Eliminar puntos en la parte entera
                                data = parts.join("."); // Reconstruir con coma como separador decimal
                              } else {
                                data = data.replace(/[\.]/g, ""); // Eliminar puntos si no hay coma
                              }
                              return data; // Devolver dato formateado
                            }

                            // Formatear columnas con fechas
                            else if (column === NaN || column === NaN) {
                              const arr = data.split(".");
                              if (arr.length === 3) {
                                return arr[0] + arr[1] + arr[2]; // Concatenar día, mes, año
                              } else if (arr.length === 2) {
                                return arr[0] + arr[1]; // Concatenar día y mes
                              } else if (arr.length === 1) {
                                return arr[0]; // Día solamente
                              }
                            }
                          }

                          return data; // Devolver dato original si no hay transformaciones
                        },
                      },
                    },
                  },
                ],
                columnDefs: [
                  {
                    className: "dt-body-right",
                    targets: [1, 2, 4, 5],
                  },
                  {
                    targets: 1,
                    data: function (row, type, val, meta) {
                      if (type === "set") {
                        row[meta.col] = val;
                        return;
                      } else if (type === "display") {
                        return formatNumber(row[meta.col], 2);
                      }
                      return row[meta.col];
                    },
                  }, // decimales específicos ARS
                ],
                columns: [
                  {
                    data: "account",
                    title: "Account",
                  },
                  {
                    data: "available_ars",
                    title: "Available ARS",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "available_usd",
                    title: "Available USD",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  { data: "client", title: "Client" },
                  {
                    data: "holding_ars",
                    title: "Holding ARS",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "holding_usd",
                    title: "Holding USD",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                ],
              });
            }
          } catch (error) {
            console.error(error);
          }
        };

        try {
          await PorfolioResume(account_id);
        } catch (error) {
          console.error("Error al obtener los datos", error);
        } finally {
          if (
            !$("#spinnerContainer")
              .find("p")
              .text()
              .includes("Datos no encontrados")
          ) {
            $("#spinnerContainer").hide();
            modalResumen.dialog("close");
            $("#loading-data-resumen").hide();
          }
        }
      },
      CANCELAR: function () {
        modalResumen.dialog("close");
        $("#spinnerContainer").remove();
        $("#modalResumen form").validate().resetForm(); // Restablecer las validaciones
        $("#modalResumen input").attr("placeholder", ""); // retablecer los placeholders
        $("#resumenAccount").prop("disabled", false);
        buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
        controller.abort();
      },
    },
    close: function () {
      $("#spinnerContainer").remove();
      $("#modalResumen form").validate().resetForm(); // Restablecer las validaciones
      $("#modalResumen input").attr("placeholder", ""); // retablecer los placeholders
      $("#resumenAccount").prop("disabled", false);
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
    },
  });

  $("#loading-data-intra-day").on("click", function () {
    $("#modalIntraDay").dialog("open");
  });
  const modalIntraDay = $("#modalIntraDay").dialog({
    autoOpen: false,
    modal: true,
    height: "auto",
    width: 470,
    title: "Cargar datos",
    buttons: {
      CARGAR: async function () {
        if ($("#errorContainer")) {
          $("#errorContainer").remove();
        }
        if (
          !$(
            "#modalIntraDay input[name='account'], #modalIntraDay input[name='to_date'], #modalIntraDay input[name='currency_id'], #modalIntraDay input[name='term'], #modalIntraDay input[name='end_date'], #modalIntraDay input[name='settlement_date_bid']"
          ).valid()
        ) {
          return;
        }

        $("#cuentaIntraDay").prop("disabled", true);
        $("#to_date").prop("disabled", true);
        $("#moneda").prop("disabled", true);
        $("#include_credits").prop("disabled", true);
        $("#term").prop("disabled", true);
        $("#discriminate_positions").prop("disabled", true);
        $("#end_date").prop("disabled", true);
        $("#settlement_date_bid").prop("disabled", true);

        const spinnerContainer = `
            <div id="spinnerContainer" style="display: flex; align-items: center; margin-right: 1rem;">
                <i class="fa fa-spinner fa-spin" style="font-size:16px"></i>
                <p style="margin-left: 0.5rem; font-size: 16px; font-weight: 600">Cargando datos...</p>
            </div>
        `;
        const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
        buttonPane.css("display", "flex");
        buttonPane.css("justify-content", "flex-end");
        buttonPane.find("#spinnerContainer").remove(); // Eliminar cualquier spinner existente
        buttonPane.find("button").prop("disabled", true); // Desactivar todos los botones
        buttonPane.prepend(spinnerContainer);

        const timeoutId = setTimeout(() => {
          buttonPane.find("#spinnerContainer").remove(); // Eliminar el spinner
          buttonPane.prepend(`
             <div id="errorContainer" style="display: flex;  gap: 7px; align-items: center; margin-right: 1rem;">
                  <i class="fa fa-info-circle" style="font-size: 16px; color: red;"></i>
                  <p style="margin-top: 0px; font-size: 16px; text-align: center; font-weight: 600; color: red;">
                     Error al cargar los datos.
                  </p>
                </div>
            </div>
          `);

          $("#cuentaIntraDay").prop("disabled", false);
          $("#to_date").prop("disabled", false);
          $("#moneda").prop("disabled", false);
          $("#include_credits").prop("disabled", false);
          $("#term").prop("disabled", false);
          $("#discriminate_positions").prop("disabled", false);
          $("#end_date").prop("disabled", false);
          $("#settlement_date_bid").prop("disabled", false);
          buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
        }, 59000); // 40 segundos

        // Obtener valores de los inputs
        const account_id = $("#cuentaIntraDay").val();
        const to_date = $("#to_date").val();
        const currency_id = $("#moneda").val();

        const term = $("#term").val();

        // Convertir valores de checkboxes a true/false
        const include_credits = $("#include_credits").is(":checked");

        const discriminate_positions = $("#discriminate_positions").is(
          ":checked"
        );

        const end_date = $("#end_date").val();

        const settlement_date_bid = $("#settlement_date_bid").val();

        const getCurrencyId = (currency) => {
          switch (currency) {
            case "arg":
              return 1;
            case "usd":
              return 2;
            default:
              return 0;
          }
        };

        const currency_id_num = getCurrencyId(currency_id);
        console.log(currency_id_num);

        const PortfolioIntraDay = async () => {
          controller = new AbortController();
          const signal = controller.signal;

          const URL = `https://api.latinsecurities.ar/v1_0/api/portfolio/18baae5e-cb8b-405b-b962-d5591a0efb4d/intra/daily?investment_account_id=${account_id}&to_date=${to_date}&currency_id=${currency_id_num}&pending_days_for_subscription=7&pending_days_for_rescue=0&term=${term}&include_credits=${include_credits}&placement_end_date=${end_date}&apply_pending_redemption_settlement=true&age_vcp=7&settlement_date_bid=${settlement_date_bid}&discriminate_monetary_position=${discriminate_positions}`;
          try {
            const response = await fetch(URL, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accesToken}`,
                "Content-Type": "application/json",
              },
              signal: signal,
            });
            const data = await response.json();

            if (!data || data.length === 0) {
              // Mostrar mensaje en el modal sin cerrarlo
              $("#spinnerContainer").empty().append(`
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <i class="fa fa-info-circle" style="font-size: 16px; color: orange;"></i>
                  <p style="margin-top: 0px; font-size: 16px; font-weight: 600; color: orange;">
                    Datos no encontrados.
                  </p>
                </div>
              `);
              $("#cuentaIntraDay").prop("disabled", false);
              $("#to_date").prop("disabled", false);
              $("#moneda").prop("disabled", false);
              $("#include_credits").prop("disabled", false);
              $("#discriminate_positions").prop("disabled", false);
              $("#term").prop("disabled", false);
              $("#end_date").prop("disabled", false);
              $("#settlement_date_bid").prop("disabled", false);
              buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
              return; // Salir de la función sin cerrar el modal
            }

            $("#tableIntraDayInicial").dataTable().fnDestroy();
            $("#tableIntraDayInicial").remove();

            if ($.fn.dataTable.isDataTable("#tableIntraDay")) {
              const table = $("#tableIntraDay").DataTable();
              table.clear();
              table.rows.add(data);
              table.draw();
            } else {
              $("#tableIntraDay").dataTable({
                dom: "Bfrtip",
                autowidth: true,
                data: data,
                buttons: [
                  {
                    text: "Cargar datos",
                    action: function (e, dt, node, config) {
                      modalIntraDay.dialog("open");
                    },
                  },
                  {
                    extend: "excelHtml5",
                    customize: function (xlsx) {
                      var sheet = xlsx.xl.worksheets["sheet1.xml"];

                      // Aplicar estilo existente (ejemplo: 64)
                      $('row c[r^="C"]', sheet).attr("s", "64"); // Números normales
                    },
                    exportOptions: {
                      format: {
                        body: function (data, row, column, node) {
                          // Verificar si el dato es válido y convertirlo a cadena
                          if (typeof data !== "undefined" && data !== null) {
                            data = String(data).trim(); // Convertir a cadena y eliminar espacios

                            // Formatear columnas con números
                            if (column === 2) {
                              // Formato para español: Decimales con coma y miles con punto
                              data = data.replace(/[^\d,.-]/g, ""); // Eliminar caracteres no numéricos
                              if (data.includes(",")) {
                                // Asegurarse de que solo haya un separador decimal
                                const parts = data.split(",");
                                parts[0] = parts[0].replace(/[\.]/g, ""); // Eliminar puntos en la parte entera
                                data = parts.join("."); // Reconstruir con coma como separador decimal
                              } else {
                                data = data.replace(/[\.]/g, ""); // Eliminar puntos si no hay coma
                              }
                              return data; // Devolver dato formateado
                            }

                            // Formatear columnas con fechas
                            else if (column === NaN || column === NaN) {
                              const arr = data.split(".");
                              if (arr.length === 3) {
                                return arr[0] + arr[1] + arr[2]; // Concatenar día, mes, año
                              } else if (arr.length === 2) {
                                return arr[0] + arr[1]; // Concatenar día y mes
                              } else if (arr.length === 1) {
                                return arr[0]; // Día solamente
                              }
                            }
                          }

                          return data; // Devolver dato original si no hay transformaciones
                        },
                      },
                    },
                  },
                ],
                columnDefs: [
                  {
                    className: "dt-body-right",
                    targets: [2, 3, 4, 5],
                  },
                  {
                    targets: 1,
                    data: function (row, type, val, meta) {
                      if (type === "set") {
                        row[meta.col] = val;
                        return;
                      } else if (type === "display") {
                        return formatNumber(row[meta.col], 2);
                      }
                      return row[meta.col];
                    },
                  }, // decimales específicos ARS
                ],
                columns: [
                  { data: "detail", title: "Detail" },
                  { data: "currency_symbol", title: "Currency symbol" },
                  {
                    data: "amount",
                    title: "Amount",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  { data: "order", title: "Order" },
                  {
                    data: "currency_code",
                    title: "Currency code",
                  },
                  {
                    data: "is_available",
                    title: "Is available",
                  },
                ],
              });
            }
          } catch (error) {
            console.error(error);
          }
        };

        try {
          await PortfolioIntraDay(
            account_id,
            to_date,
            currency_id,
            term,
            include_credits,
            end_date,
            settlement_date_bid,
            discriminate_positions
          );
        } catch (error) {
          console.error("Error al obtener los datos", error);
        } finally {
          clearTimeout(timeoutId);
          if ($("#errorContainer").length === 0) {
            if (
              !$("#spinnerContainer")
                .find("p")
                .text()
                .includes("Datos no encontrados")
            ) {
              $("#spinnerContainer").hide();
              modalIntraDay.dialog("close");
              $("#loading-data-intra-day").hide();
            }
          }
        }
      },
      CANCELAR: function () {
        modalIntraDay.dialog("close");
        $("#spinnerContainer").remove();
        controller.abort();
        $("#errorContainer").remove();
        $("#modalIntraDay form").validate().resetForm(); // Restablecer las validaciones
        $("#modalIntraDay input").attr("placeholder", ""); // retablecer los placeholders
        $("#cuentaIntraDay").prop("disabled", false);
        $("#to_date").prop("disabled", false);
        $("#moneda").prop("disabled", false);
        $("#include_credits").prop("disabled", false);
        $("#discriminate_positions").prop("disabled", false);
        $("#end_date").prop("disabled", false);
        $("#settlement_date_bid").prop("disabled", false);
        $("#term").prop("disabled", false);
        buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
      },
    },
    close: function () {
      $("#spinnerContainer").remove(), $("#errorContainer").remove();
      $("#modalIntraDay form").validate().resetForm(); // Restablecer las validaciones
      $("#modalIntraDay input").attr("placeholder", ""); // retablecer los placeholders
      $("#cuentaIntraDay").prop("disabled", false);
      $("#to_date").prop("disabled", false);
      $("#moneda").prop("disabled", false);
      $("#include_credits").prop("disabled", false);
      $("#discriminate_positions").prop("disabled", false);
      $("#end_date").prop("disabled", false);
      $("#settlement_date_bid").prop("disabled", false);
      $("#term").prop("disabled", false);
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
    },
  });

  // validae jquery para el modal de la tabla de movimientos de  intraday
  $("#modalIntraDay form").validate({
    required: true,
    ignore: "",
    rules: {
      account: {
        required: true,
        minlength: 1,
      },
      to_date: {
        required: true,
        minlength: 1,
      },
      currency_id: {
        required: true,
        minlength: 1,
      },
      term: {
        required: true,
        minlength: 1,
      },
      end_date: {
        required: true,
        minlength: 1,
      },
      settlement_date_bid: {
        required: true,
        minlength: 1,
      },
    },
    messages: {
      account: {
        required: "Cuenta requerida",
      },
      to_date: {
        required: "Fecha requerida",
      },
      currency_id: {
        required: "Moneda requerida",
      },
      term: {
        required: "Plazo requerido",
      },
      end_date: {
        required: "Fecha requerida",
      },
      settlement_date_bid: {
        required: "Fecha requerida",
      },
    },
    errorPlacement: function (error, element) {
      const errorMessage = error.text();
      element.attr("data-placeholder", element.attr("placeholder"));
      element.attr("placeholder", errorMessage);
    },
    highlight: function (element) {
      $(element).css("border-color", "red"); // Cambia el borde del input en caso de error
    },
    unhighlight: function (element) {
      $(element).css("border-color", ""); // Restablece el borde si no hay error
      $(element).attr("placeholder", $(element).attr("data-placeholder"));
    },
  });

  $("#modalResumen form").validate({
    rules: {
      account: {
        required: true,
        minlength: 1,
      },
      messages: {
        account: {
          required: "Cuenta requerido",
        },
      },
    },
    errorPlacement: function (error, element) {
      const errorMessage = error.text();
      element.attr("data-placeholder", element.attr("placeholder"));
      element.attr("placeholder", errorMessage);
    },
    highlight: function (element) {
      $(element).css("border-color", "red"); // Cambia el borde del input en caso de error
    },
    unhighlight: function (element) {
      $(element).css("border-color", ""); // Restablece el borde si no hay error
      $(element).attr("placeholder", $(element).attr("data-placeholder"));
    },
  });

  $("#totalInvestmentAccountModal form").validate({
    rules: {
      account: {
        required: true,
        minlength: 1,
      },
      messages: {
        account: {
          required: "Cuenta requerido",
        },
      },
    },
    errorPlacement: function (error, element) {
      const errorMessage = error.text();
      element.attr("data-placeholder", element.attr("placeholder"));
      element.attr("placeholder", errorMessage);
    },
    highlight: function (element) {
      $(element).css("border-color", "red"); // Cambia el borde del input en caso de error
    },
    unhighlight: function (element) {
      $(element).css("border-color", ""); // Restablece el borde si no hay error
      $(element).attr("placeholder", $(element).attr("data-placeholder"));
    },
  });

  $("#parametrosMovements form").validate({
    rules: {
      to_date: {
        required: true,
        minlength: 1,
      },
      from_date: {
        required: true,
        minlength: 1,
      },
      messages: {
        to_date: {
          required: "Fecha requerido",
        },
        from_date: {
          required: "Fecha requerido",
        },
      },
    },
    errorPlacement: function (error, element) {
      const errorMessage = error.text();
      element.attr("data-placeholder", element.attr("placeholder"));
      element.attr("placeholder", errorMessage);
    },
    highlight: function (element) {
      $(element).css("border-color", "red"); // Cambia el borde del input en caso de error
    },
    unhighlight: function (element) {
      $(element).css("border-color", ""); // Restablece el borde si no hay error
      $(element).attr("placeholder", $(element).attr("data-placeholder"));
    },
  });

  $("#parametrosMovementsDeposit form").validate({
    rules: {
      to_date: {
        required: true,
        minlength: 1,
      },
      from_date: {
        required: true,
        minlength: 1,
      },
      messages: {
        to_date: {
          required: "Fecha requerido",
        },
        from_date: {
          required: "Fecha requerido",
        },
      },
    },
    errorPlacement: function (error, element) {
      const errorMessage = error.text();
      element.attr("data-placeholder", element.attr("placeholder"));
      element.attr("placeholder", errorMessage);
    },
    highlight: function (element) {
      $(element).css("border-color", "red"); // Cambia el borde del input en caso de error
    },
    unhighlight: function (element) {
      $(element).css("border-color", ""); // Restablece el borde si no hay error
      $(element).attr("placeholder", $(element).attr("data-placeholder"));
    },
  });

  $("#frmHoldingBalance").validate({
    rules: {
      account: {
        required: true,
        minlength: 1,
      },
      to_date: {
        required: true,
        minlength: 1,
      },
      messages: {
        account: {
          required: "Cuenta requerida",
        },
        from_date: {
          required: "Fecha requerido",
        },
      },
    },
    errorPlacement: function (error, element) {
      const errorMessage = error.text();
      element.attr("data-placeholder", element.attr("placeholder"));
      element.attr("placeholder", errorMessage);
    },
    highlight: function (element) {
      $(element).css("border-color", "red"); // Cambia el borde del input en caso de error
    },
    unhighlight: function (element) {
      $(element).css("border-color", ""); // Restablece el borde si no hay error
      $(element).attr("placeholder", $(element).attr("data-placeholder"));
    },
  });
});
