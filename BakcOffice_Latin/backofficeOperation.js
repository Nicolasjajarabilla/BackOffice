$(document).ready(async function () {
  $("#tabs").tabs();

  $(".operation").trigger("click");
  $(".operation a i").addClass("far fa-hand-point-left");
  $(".operation a").css("font-weight", "bold");
  $(".operation a").css("color", "#FFEA2F");

  let controller;

  const AUTH_URL =
    "https://auth.latinsecurities.ar/realms/invera-broker/protocol/openid-connect/token";
  const client_id = "condor-via-api";
  const client_secret = "WPpqupSpHpcWOfbdLSosGBlcXluv9RH8";
  const grant_type = "client_credentials";

  let accesToken = "";

  function calcularNumeroElementosPorPagina() {
    let alturaTabla = $(window).height() * 0.7;
    let resolucionPantalla = window.screen.width;
    if (resolucionPantalla >= 2560 || resolucionPantalla >= 1920) {
      return Math.floor(alturaTabla / 25);
    } else {
      return 25;
    }
  }

  function formatDate(isoDate) {
    if (!isoDate) return "";
    const date = new Date(isoDate);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  }

  const fetchToken = async () => {
    try {
      console.log("Renovando Token...");

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
      console.log(data);
      accesToken = data.access_token;
      setTimeout(fetchToken, 300000);
    } catch (error) {
      console.error("Error al obtener el token de acceso:", error);
    }
  };

  await fetchToken();

  // modal para editar los parametros de la API

  $("#loading-data-fci").on("click", async function () {
    modalParamsOperacionestickets.dialog("open");
  });
  const modalParamsOperacionestickets = $("#modalOperacionesContent").dialog({
    title: "Datos",
    autoOpen: false,
    modal: true,
    width: 415,
    height: "auto",
    buttons: {
      CARGAR: async function () {
        if (
          !$(
            "#modalOperacionesContent input[name='from_date'], #modalOperacionesContent input[name='to_date']"
          ).valid()
        ) {
          return;
        }

        $("#from_date").prop("disabled", true);
        $("#to_date").prop("disabled", true);

        $("#loadingSpinnerticket").show();
        // Funciones para obtener los valores de los campos del formulario
        const getFromDate = () => $("#from_date").val();
        const getToDate = () => $("#to_date").val();
        const getSize = () => $("#size").val();

        // Obtener los valores
        const fromDate = getFromDate();
        const toDate = getToDate();
        const size = getSize();

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

        const FCITickets = async () => {
          controller = new AbortController();
          const signal = controller.signal;

          const URL = `https://api.latinsecurities.ar/v1_0/api/fci-tickets/18baae5e-cb8b-405b-b962-d5591a0efb4d?from_date=${fromDate}&to_date=${toDate}`;
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
              $("#from_date").prop("disabled", false);
              $("#to_date").prop("disabled", false);
              buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
              return; // Salir de la función sin cerrar el modal
            }
            if ($.fn.dataTable.isDataTable("#fciTicketsTable")) {
              const table = $("#fciTicketsTable").DataTable();
              table.clear(); // Limpiar datos existentes
              table.rows.add(data); // Agregar los nuevos datos
              table.draw(); // Redibujar la tabla
            } else {
              console.log(data);
              $("#fciTicketsTable").DataTable({
                data: data, // Asigna los datos obtenidos de la API
                autowidth: true, // Desactiva el ajuste automático del ancho
                scrollX: true, // Habilita el desplazamiento horizontal
                pageLength: calcularNumeroElementosPorPagina(),
                scrollCollapse: true,
                buttons: [
                  {
                    text: "Cargar datos",
                    action: function () {
                      modalParamsOperacionestickets.dialog("open");
                    },
                  },
                  {
                    extend: "excelHtml5",
                    customize: function (xlsx) {
                      var sheet = xlsx.xl.worksheets["sheet1.xml"];

                      // Aplicar estilo existente (ejemplo: 64)
                      $('row c[r^="H"]', sheet).attr("s", "64"); // Números normales
                      $('row c[r^="J"]', sheet).attr("s", "64"); // Contabilidad (usa el estilo contable)
                      $('row c[r^="K"]', sheet).attr("s", "64"); // Números normales
                    },

                    exportOptions: {
                      format: {
                        body: function (data, row, column, node) {
                          // Verificar si el dato es válido y convertirlo a cadena
                          if (typeof data !== "undefined" && data !== null) {
                            data = String(data).trim(); // Convertir a cadena y eliminar espacios

                            // Formatear columnas con números
                            if (column === 7 || column === 9 || column === 10) {
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
                dom: "Bfrtip",
                columnDefs: [
                  {
                    className: "dt-body-right",
                    targets: [7, 9, 10],
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
                    data: "fci_ticket_code",
                    title: "FCI Ticket Code",
                  },
                  {
                    data: "investment_account_code",
                    title: "Investment Account Code",
                  },
                  {
                    data: "investment_account_id",
                    title: "Investment Account ID",
                  },
                  {
                    data: "fci_ticket_id",
                    title: "FCI Ticket ID",
                  },
                  {
                    data: "trade_date",
                    title: "Trade Date",
                    render: function (data) {
                      return formatDate(data);
                    },
                  },
                  {
                    data: "settlement_date",
                    title: "Settlement Date",
                    render: function (data) {
                      return formatDate(data);
                    },
                  },
                  {
                    data: "fund_name",
                    title: "Fund Name",
                  },
                  {
                    data: "quantity",
                    title: "Quantity",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "operation_type",
                    title: "Operation Type",
                  },
                  {
                    data: "price",
                    title: "Price",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "gross",
                    title: "Gross",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "currency_symbol",
                    title: "Currency Symbol",
                  },
                  {
                    data: "instrument_code",
                    title: "Instrument Code",
                  },
                  {
                    data: "cuit_cuil",
                    title: "CUIT/CUIL",
                  },
                  {
                    data: "client_name",
                    title: "Client Name",
                  },
                  {
                    data: "fund_description",
                    title: "Fund Description",
                  },
                ],
              });
              $("#fciTicketsTable").columns.adjust().draw();
            }

            // Aquí puedes procesar los datos obtenidos de la API
          } catch (error) {
            console.error("Error al obtener los datos de la API:", error);
          }
        };

        try {
          await FCITickets(fromDate, toDate, size);
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
            modalParamsOperacionestickets.dialog("close");
            $("#loading-data-fci").hide();
          }
        }
      },
      CANCELAR: function () {
        modalParamsOperacionestickets.dialog("close");
        $("#spinnerContainer").remove();
        $("#modalOperacionesContent form").validate().resetForm(); // Restablecer las validaciones
        $("#modalOperacionesContent input").attr("placeholder", ""); // retablecer los placeholders
        $("#from_date").prop("disabled", false);
        $("#to_date").prop("disabled", false);
        buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
        controller.abort();
      },
    },
    close: function () {
      $("#spinnerContainer").remove();
      $("#modalOperacionesContent form").validate().resetForm(); // Restablecer las validaciones
      $("#modalOperacionesContent input").attr("placeholder", ""); // retablecer los placeholders
      $("#from_date").prop("disabled", false);
      $("#to_date").prop("disabled", false);
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
    },
  });

  // Cargar datos de la API inicialmente con valores por defecto

  // Definir el modal para obtener parámetros adicionales

  $("#loading-data-trade").on("click", async function () {
    modalParmsOperacionesTrade.dialog("open");
  });
  const modalParmsOperacionesTrade = $("#modal-content-trade").dialog({
    title: "Datos",
    autoOpen: false,
    modal: true,
    width: 415,
    height: "auto",
    buttons: {
      CARGAR: async function () {
        if (
          !$(
            "#modal-content-trade input[name='from_date'], #modal-content-trade input[name='to_date']"
          ).valid()
        ) {
          return;
        }

        $("#from_date_trade").prop("disabled", true);
        $("#to_date_trade").prop("disabled", true);

        const getFromDateTrade = () => $("#from_date_trade").val();
        const getToDateTrade = () => $("#to_date_trade").val();

        const fromDate = getFromDateTrade();
        const toDate = getToDateTrade();

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

        const TradeTickets = async () => {
          controller = new AbortController();
          const signal = controller.signal;

          const URL = `https://api.latinsecurities.ar/v1_0/api/trade-tickets/18baae5e-cb8b-405b-b962-d5591a0efb4d?from_date=${fromDate}&to_date=${toDate}`;

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
              $("#from_date_trade").prop("disabled", false);
              $("#to_date_trade").prop("disabled", false);
              buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
              return; // Salir de la función sin cerrar el modal
            }

            $("#tradeTicketsTableInicial").dataTable().fnDestroy();
            $("#tradeTicketsTableInicial").dataTable().remove();

            // Actualizar la tabla principal con los datos obtenidos
            if ($.fn.dataTable.isDataTable("#tradeTicketsTable")) {
              const table = $("#tradeTicketsTable").DataTable();
              table.clear(); // Limpiar datos existentes
              table.rows.add(data); // Agregar los nuevos datos
              table.draw(); // Redibujar la tabla
            } else {
              $.fn.dataTable.render.numberFormat = function () {
                return function (data, type) {
                  if (type === "display" && typeof data === "number") {
                    return data.toLocaleString("es-ES", {
                      minimumFractionDigits: 2,
                    });
                  }
                  return data;
                };
              };

              // Inicializar la tabla si no existe
              $("#tradeTicketsTable").DataTable({
                data: data, // Asigna los datos obtenidos de la API
                autoWidth: true, // Desactiva el ajuste automático del ancho
                scrollX: true, // Habilita el desplazamiento horizontal
                pageLength: calcularNumeroElementosPorPagina(),
                scrollCollapse: true,
                dom: "Bfrtip",
                render: function (data) {
                  return data
                    ? data.toLocaleString("es-ES", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : data;
                },
                buttons: [
                  {
                    text: "Cargar datos",
                    action: function () {
                      modalParmsOperacionesTrade.dialog("open");
                    },
                  },
                  {
                    extend: "excelHtml5",
                    customize: function (xlsx) {
                      var sheet = xlsx.xl.worksheets["sheet1.xml"];

                      // Aplicar estilo existente (ejemplo: 64)
                      $('row c[r^="H"]', sheet).attr("s", "64"); // Números normales
                      $('row c[r^="I"]', sheet).attr("s", "64"); // Números normales
                      $('row c[r^="J"]', sheet).attr("s", "64"); // Contabilidad (usa el estilo contable)
                      $('row c[r^="K"]', sheet).attr("s", "64"); // Números normales
                      $('row c[r^="T"]', sheet).attr("s", "64"); // Números normales
                      $('row c[r^="U"]', sheet).attr("s", "64"); // Números normales
                    },
                    exportOptions: {
                      format: {
                        body: function (data, row, column, node) {
                          // Verificar si el dato es válido y convertirlo a cadena
                          if (typeof data !== "undefined" && data !== null) {
                            data = String(data).trim(); // Convertir a cadena y eliminar espacios

                            // Formatear columnas con números
                            if (
                              column === 7 ||
                              column === 8 ||
                              column === 9 ||
                              column === 10 ||
                              column === 19 ||
                              column === 20
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
                          s;

                          return data; // Devolver dato original si no hay transformaciones
                        },
                      },
                    },
                  },
                ],
                columnDefs: [
                  {
                    className: "dt-body-right",
                    targets: [7, 8, 9, 10, 13, 14, 18, 19, 20, 22],
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
                    data: "client_name",
                    title: "Client Name",
                  },
                  {
                    data: "trade_ticket_code",
                    title: "Trade Ticket Code",
                  },
                  {
                    data: "trade_ticket_id",
                    title: "Trade Ticket ID",
                  },
                  {
                    data: "investment_account_code",
                    title: "Investment Account Code",
                  },
                  {
                    data: "investment_account_id",
                    title: "Investment Account ID",
                  },
                  {
                    data: "trade_date",
                    title: "Trade Date",
                    render: function (data) {
                      return formatDate(data);
                    },
                  },
                  {
                    data: "settlement_date",
                    title: "Settlement Date",
                    render: function (data) {
                      return formatDate(data);
                    },
                  },
                  {
                    data: "quantity",
                    title: "Quantity",
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
                    data: "gross",
                    title: "Gross",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "net",
                    title: "Net",

                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "market_operation_code",
                    title: "Market Operation Code",
                  },
                  {
                    data: "instrument_abbreviation",
                    title: "Instrument Abbreviation",
                  },
                  {
                    data: "is_debit",
                    title: "Is Debit",
                  },
                  {
                    data: "currency_code",
                    title: "Currency Code",
                  },
                  {
                    data: "currency_symbol",
                    title: "Currency Symbol",
                  },
                  {
                    data: "instrument_id",
                    title: "Instrument ID",
                  },
                  {
                    data: "instrument_code",
                    title: "Instrument Code",
                  },
                  { data: "tariff", title: "Tariff" },
                  {
                    data: "settlement_register",
                    title: "Settlement Register",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "market_right",
                    title: "Market Right",
                    render: function (data, type, row, meta) {
                      return formatNumber(data, 2);
                    },
                  },
                  {
                    data: "instrument_type",
                    title: "Instrument Type",
                  },
                  {
                    data: "code_instrument_type",
                    title: "Instrument Type Code",
                  },
                  {
                    data: "security_type",
                    title: "Security Type",
                  },
                  { data: "origin", title: "Origin" },
                  { data: "description", title: "Description", width: "300px" },
                  { data: "market", title: "Market" },
                ],
              });
            }
          } catch (error) {
            console.error("Error al obtener los datos de la API:", error);
          }
        };

        try {
          await TradeTickets(fromDate, toDate);
          //actualizar la tabla con los nuevos valores
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
            modalParmsOperacionesTrade.dialog("close");
            $("#loading-data-trade").hide();
          }
        }
      },
      CANCELAR: function () {
        modalParmsOperacionesTrade.dialog("close");
        $("#spinnerContainer").empty();
        AbortController.abort();
        $("#modal-content-trade form").validate().resetForm(); // Restablecer las validaciones
        $("#modal-content-trade input").attr("placeholder", ""); // retablecer los placeholders
        $("#from_date_trade").prop("disabled", false);
        $("#to_date_trade").prop("disabled", false);
        buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
      },
    },
    close: function () {
      $("#spinnerContainer").remove();
      $("#modal-content-trade form").validate().resetForm(); // Restablecer las validaciones
      $("#modal-content-trade input").attr("placeholder", ""); // retablecer los placeholders
      $("#from_date_trade").prop("disabled", false);
      $("#to_date_trade").prop("disabled", false);
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", false); // Desactivar todos los botones
    },
  });

  $("#modalOperacionesContent form").validate({
    required: true,
    ignore: "",
    rules: {
      from_date: {
        required: true,
        minlength: 1,
      },
      to_date: {
        required: true,
        minlength: 1,
      },
    },
    message: {
      from_date: {
        required: "fecha requerida",
      },
      to_date: {
        required: "fecha requerida",
      },
    },
    errorPlacement: function (error, element) {
      const errorMassage = error.text();
      element.attr("data-placeholder", element.attr("placeholder"));
      element.attr("placeholder", errorMassage);
    },
    highlight: function (element) {
      $(element).css("border-color", "red");
    },
    unhighlight: function (element) {
      $(element).css("border-color", "");
      $(element).attr("placeholder", $(element).attr("data-placeholder"));
    },
  });

  $("#modal-content-trade form").validate({
    required: true,
    ignore: "",
    rules: {
      from_date: {
        required: true,
        minlength: 1,
      },
      to_date: {
        required: true,
        minlength: 1,
      },
    },
    message: {
      from_date: {
        required: "fecha requerida",
      },
      to_date: {
        required: "fecha requerida",
      },
    },
    errorPlacement: function (error, element) {
      const errorMassage = error.text();
      element.attr("data-placeholder", element.attr("placeholder"));
      element.attr("placeholder", errorMassage);
    },
    highlight: function (element) {
      $(element).css("border-color", "red"); // Cambia el borde del input en caso de error
    },
    unhighlight: function (element) {
      $(element).css("border-color", "");
      $(element).attr("placeholder", $(element).attr("data-placeholder"));
    },
  });
});
