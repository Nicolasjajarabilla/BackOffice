$(document).ready(async function () {
  $("#tabs").tabs();

  $(".posiciones").trigger("click");
  $(".posiciones a i").addClass("far fa-hand-point-left");
  $(".posiciones a").css("font-weight", "bold");
  $(".posiciones a").css("color", "#FFEA2F");

  function calcularNumeroElementosPorPagina() {
    let alturaTabla = $(window).height() * 0.7;
    let resolucionPantalla = window.screen.width;
    if (resolucionPantalla >= 2560 || resolucionPantalla >= 1920) {
      return Math.floor(alturaTabla / 25);
    } else {
      return 25;
    }
  }

  let fileBuffer = {};

  $("#tableDiferenciasUSA-IBKR-Inicial").dataTable({
    autoWidth: false,
    scrollCollapse: true,
    dom: "Bfrtip",
    buttons: [
      {
        text: "Cargar Archivos",
        action: function () {
          modalUsaIbrk.dialog("open");
        },
      },
      {
        extend: "excelHtml5",
      },
    ],
  });

  const modalUsaIbrk = $("#modalUsaIbkr").dialog({
    title: "Ejecutar Diferencias USA-IBKR",
    autoOpen: false,
    modal: true,
    width: "auto",
    height: "auto",
    resizable: false,
    open: function () {
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", true);
      buttonPane.css("display", "flex");
      buttonPane.css("justify-content", "flex-end");

      let fileNameArray = [];

      function handleFileInput(
        dropZoneId,
        textElementId,
        deleteButtonId,
        fileKey
      ) {
        const defaultText = $(textElementId).text();
        const stylePorDefecto = {
          border: "2px dashed #ccc",
          borderRadius: "0px",
          width: "290px",
          height: "auto",
          alignContent: "center",
          textAlign: "center",
          fontSize: "16px",
          color: "#ccc",
          margin: "5px 0px",
        };
        $(dropZoneId)
          .off("click")
          .on("click", function (e) {
            e.preventDefault();
            let fileInput = $(
              `<input type="file" id="file-input" style="display: none;" />`
            );
            $("main").append(fileInput);

            fileInput.click();

            fileInput.on("change", function () {
              let files = fileInput[0].files;
              for (let i = 0; i < files.length; i++) {
                let fileName = files[i].name;
                fileBuffer[fileKey] = files[i];
                console.log(fileBuffer);
                fileNameArray.push(fileName);

                $(textElementId).text(`${fileName}`);
                $(textElementId).css("color", "black");
                $(textElementId).css("fontSize", "14px");
                $(textElementId).css("border", "none");
                $(textElementId).css("textAlign", "start");
                $(deleteButtonId).data("fileName", fileName); // Almacenar el nombre del archivo en el botón

                if (fileNameArray.length == 2) {
                  buttonPane.find("button").prop("disabled", false);
                  console.log("Activando botón");
                }

                $(deleteButtonId)
                  .off("click")
                  .on("click", function (e) {
                    console.log("delete button clicked");
                    e.preventDefault();
                    delete fileBuffer[fileKey];
                    let fileNameToDelete = $(deleteButtonId).data("fileName");
                    fileNameArray = fileNameArray.filter(
                      (file) => file !== fileNameToDelete
                    );
                    console.log(fileNameArray);
                    $(textElementId).text(defaultText);
                    $(textElementId).css(stylePorDefecto);
                    if (fileNameArray.length <= 1) {
                      buttonPane.find("button").prop("disabled", true);
                    }
                  });
              }

              fileInput.remove();
            });
          });
        $(dropZoneId).on("dragover", function (e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).addClass("dragged");
        });
        $(dropZoneId).on("dragleave", function (e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).removeClass("dragged");
        });
        $(dropZoneId).on("drop", function (e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).removeClass("dragged");

          let files = e.originalEvent.dataTransfer.files;
          if (files.length > 1) {
            return;
          }

          for (let i = 0; i < files.length; i++) {
            let fileName = files[i].name;
            fileBuffer[fileKey] = files[i];
            fileNameArray.push(fileName);
            console.log(fileNameArray);

            $(textElementId).text(`${fileName}`);
            $(textElementId).css("color", "black");
            $(textElementId).css("border", "none");
            $(textElementId).css("textAlign", "start");
            $(textElementId).css("fontSize", "14px");
            $(deleteButtonId).data("fileName", fileName); // Almacenar el nombre del archivo en el botón

            if (
              fileNameArray.length == 2 &&
              Object.keys(fileBuffer).length == 2
            ) {
              buttonPane.find("button").prop("disabled", false);
              console.log("Activando botón");
            }

            $(deleteButtonId)
              .off("click")
              .on("click", function (e) {
                console.log("delete button clicked");
                e.preventDefault();
                delete fileBuffer[fileKey];
                let fileNameToDelete = $(deleteButtonId).data("fileName");
                fileNameArray = fileNameArray.filter(
                  (file) => file !== fileNameToDelete
                );
                console.log(fileNameArray);
                $(textElementId).text(defaultText);
                $(textElementId).css(stylePorDefecto);
                if (fileNameArray.length <= 1) {
                  buttonPane.find("button").prop("disabled", true);
                }
              });
          }
        });
      }

      handleFileInput("#tdUsa", "#drop-zone-usa", "#deleteUsa", "condor");
      handleFileInput("#tdIbkr", "#drop-zone-ibkr", "#deleteIbkr", "ibkr");
    },
    buttons: {
      EJECUTAR: async function () {
        let spinnerLoadingData = `
        <div id="spinnerContainer" style="display: flex; align-items: center; margin-right: 1rem;">
          <i class="fa fa-spinner fa-spin" style="font-size:16px"></i>
          <p style="margin-left: 0.5rem; font-size: 16px; font-weight: 600">Procesando diferencias</p>
        </div>
        `;

        const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
        buttonPane.find("button").prop("disabled", true);
        buttonPane.css("display", "flex");
        buttonPane.css("justify-content", "flex-end");
        buttonPane.find("#spinnerContainer").remove();
        $("#deleteArg").prop("disabled", true);
        $("#deleteLatin").prop("disabled", true);
        buttonPane.prepend(spinnerLoadingData);

        console.log("Ejecutando diferencias USA-IBKR");
        const fileCondor = fileBuffer["condor"];
        const fileIbkr = fileBuffer["ibkr"];

        if (!fileCondor || !fileIbkr) {
          console.log("Debes cargar ambos archivos.");
          return;
        }

        const formData = new FormData();
        formData.append("file_condor", fileCondor);
        formData.append("file_ibkr", fileIbkr);

        try {
          // Realizamos POST al backend
          const response = await fetch(
            "http://127.0.0.1:8000/procesar-diferencias-condor-ibkr/",
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            const error = await response.json();
            console.log(`Error: ${error.detail}`);
            return;
          }

          const getDataResponse = await fetch(
            "http://127.0.0.1:8000/obtener-diferencias-condor-ibkr/"
          );
          if (!getDataResponse.ok) {
            const getDataError = await getDataResponse.json();
            console.log(
              `Error al obtener datos procesados: ${getDataError.detail}`
            );
            return;
          }

          const getData = await getDataResponse.json();
          const resultados = getData.resultados;
          // Verifica si los resultados están vacíos

          if (!resultados || Object.keys(resultados).length === 0) {
            $("#spinnerContainer").css("display", "flex").empty().append(`
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <i class="fa fa-info-circle" style="font-size: 16px; color: orange;"></i>
          <p style="margin-top: 0px; font-size: 16px; font-weight: 600; color: orange;">
            Sin diferencias.
          </p>
        </div>
      `);

            buttonPane.find("button").prop("disabled", false);
            $("#deleteUsa").prop("disabled", false);
            $("#deleteIbkr").prop("disabled", false);
            return;
          }

          const datosProcesados = Object.entries(getData.resultados).map(
            ([simbolo, valores]) => ({
              simbolo,
              qty_condor: valores["Qty-condor"],
              qty_ibkr: valores["Qty-ibkr"],
              qty_diferencias: valores["Qty-diferencias"],
            })
          );

          // ...existing code...

          $("#tableDiferenciasUSA-IBKR-Inicial").dataTable().fnDestroy();
          $("#tableDiferenciasUSA-IBKR-Inicial").remove();

          if ($.fn.DataTable.isDataTable("#tableDiferencias-USA-IBKR")) {
            const table = $("#tableDiferencias-USA-IBKR").DataTable();
            table.clear();
            table.rows.add(datosProcesados);
            table.draw();
          } else {
            $("#tableDiferencias-USA-IBKR").DataTable({
              data: datosProcesados,
              autoWidth: true,
              searching: true,
              info: true,
              pageLength: calcularNumeroElementosPorPagina(),
              scrollCollapse: true,
              dom: "Bfrtip",
              buttons: [
                {
                  text: "Cargar Archivos",
                  action: function () {
                    modalUsaIbrk.dialog("open");
                  },
                },
                {
                  extend: "excelHtml5",
                  customize: function (xlsx) {
                    var sheet = xlsx.xl.worksheets["sheet1.xml"];

                    // Aplicar estilo existente (ejemplo: 64)
                    $('row c[r^="B"]', sheet).attr("s", "64"); // Números normales
                    $('row c[r^="C"]', sheet).attr("s", "64"); // Números normales
                    $('row c[r^="D"]', sheet).attr("s", "64"); // Contabilidad (usa el estilo contable)
                  },
                  exportOptions: {
                    format: {
                      body: function (data, row, column, node) {
                        // Verificar si el dato es válido y convertirlo a cadena
                        if (typeof data !== "undefined" && data !== null) {
                          data = String(data).trim(); // Convertir a cadena y eliminar espacios

                          // Formatear columnas con números
                          if (column === 1 || column === 2 || column === 3) {
                            // Formato para español: Decimales con coma y miles con punto
                            data = data.replace(/[^\d.-]/g, ""); // Eliminar caracteres no numéricos
                            return data; // Devolver dato formateado
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
                  targets: [1, 2, 3],
                  data: function (row, type, val, meta) {
                    if (type === "set") {
                      row[meta.col] = val;
                      return;
                    } else if (type === "display") {
                      return formatNumber(row[meta.col], 0);
                    }
                    return row[meta.col];
                  },
                },
              ],
              columns: [
                { title: "Simbolo", data: "simbolo" },
                {
                  title: "Cantidad Condor",
                  data: "qty_condor",
                  render: function (data, type, row, meta) {
                    return formatNumber(data, 0);
                  },
                },
                {
                  title: "Cantidad IBKR",
                  data: "qty_ibkr",
                  render: function (data, type, row, meta) {
                    return formatNumber(data, 0);
                  },
                },
                {
                  title: "Diferencias",
                  data: "qty_diferencias",
                  render: function (data, type, row, meta) {
                    return formatNumber(data, 0);
                  },
                },
              ],
            });
          }
        } catch (error) {
          console.error(`Ocurrió un error: ${error.message}`);
        } finally {
          const spinnerText = $("#spinnerContainer").find("p").text();
          if (!spinnerText.includes("Sin diferencias.")) {
            $("#spinnerContainer").hide();
          }
          buttonPane.find("button").prop("disabled", false);
          $("#deleteArg").prop("disabled", false);
          $("#deleteLatin").prop("disabled", false);
        }

        $(this).dialog("close");
      },
    },
    close: () => {
      $("input#file-input").remove();
      $("input#file-input").empty();
      // queiro que cuando se cierre el modal se limpie el fileBuffer y también los textos de los dropzones
      const stylePorDefecto = {
        border: "2px dashed #ccc",
        borderRadius: "0px",
        width: "290px",
        height: "auto",
        alignContent: "center",
        textAlign: "center",
        fontSize: "16px",
        color: "#ccc",
        margin: "5px 0px",
      };
      // queiro que cuando se cierre el modal se limpie el fileBuffer y también los textos de los dropzones
      $("#drop-zone-usa").text("Haga click o arrastre el archivo aqui");
      $("#drop-zone-usa").css(stylePorDefecto);
      $("#drop-zone-ibkr").text("Haga click o arrastre el archivo aqui");
      $("#drop-zone-ibkr").css(stylePorDefecto);
      $("#spinnerContainer").hide();
      fileBuffer = {};
    },
  });

  $("#tableDiferenciasARG-LATIN-Inicial").dataTable({
    autoWidth: false,
    pageLength: calcularNumeroElementosPorPagina(),
    scrollCollapse: true,
    dom: "Bfrtip",
    buttons: [
      {
        text: "Cargar Archivos",
        action: function () {
          modalArgentinaLatin.dialog("open");
        },
      },
      {
        extend: "excelHtml5",
      },
    ],
  });

  const modalArgentinaLatin = $("#modalArgLatin").dialog({
    title: "Ejecutar Diferencias Argentina-Latin",
    autoOpen: false,
    modal: true,
    width: "auto",
    height: "auto",
    resizable: false,
    open: function () {
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", true);
      buttonPane.css("display", "flex");
      buttonPane.css("justify-content", "flex-end");

      let fileNameArray = [];

      function handleFileInput(
        dropZoneId,
        textElementId,
        deleteButtonId,
        fileKey
      ) {
        const defaultText = $(textElementId).text();
        const stylePorDefecto = {
          border: "2px dashed #ccc",
          borderRadius: "0px",
          width: "290px",
          height: "auto",
          alignContent: "center",
          textAlign: "center",
          fontSize: "16px",
          color: "#ccc",
          margin: "5px 0px",
        };
        $(dropZoneId)
          .off("click")
          .on("click", function (e) {
            e.preventDefault();
            let fileInput = $(
              `<input type="file" id="file-input" style="display: none;" />`
            );
            $("main").append(fileInput);

            fileInput.click();

            fileInput.on("change", function () {
              let files = fileInput[0].files;
              for (let i = 0; i < files.length; i++) {
                let fileName = files[i].name;
                fileBuffer[fileKey] = files[i];
                console.log(fileBuffer);
                fileNameArray.push(fileName);
                console.log(fileNameArray);

                $(textElementId).text(`${fileName}`);
                $(textElementId).css("color", "black");
                $(textElementId).css("fontSize", "14px");
                $(textElementId).css("border", "none");
                $(textElementId).css("textAlign", "start");
                $(deleteButtonId).data("fileName", fileName); // Almacenar el nombre del archivo en el botón

                if (fileNameArray.length == 2) {
                  buttonPane.find("button").prop("disabled", false);
                  console.log("Activando botón");
                }

                $(deleteButtonId)
                  .off("click")
                  .on("click", function (e) {
                    console.log("delete button clicked");
                    e.preventDefault();
                    delete fileBuffer[fileKey];
                    let fileNameToDelete = $(deleteButtonId).data("fileName");
                    fileNameArray = fileNameArray.filter(
                      (file) => file !== fileNameToDelete
                    );
                    console.log(fileNameArray);
                    $(textElementId).text(defaultText);
                    $(textElementId).css(stylePorDefecto);
                    if (fileNameArray.length <= 1) {
                      buttonPane.find("button").prop("disabled", true);
                    }
                  });
              }

              fileInput.remove();
            });
          });
        $(dropZoneId).on("dragover", function (e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).addClass("dragged");
        });
        $(dropZoneId).on("dragleave", function (e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).removeClass("dragged");
        });
        $(dropZoneId).on("drop", function (e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).removeClass("dragged");

          let files = e.originalEvent.dataTransfer.files;
          if (files.length > 1) {
            return;
          }

          for (let i = 0; i < files.length; i++) {
            let fileName = files[i].name;
            fileNameArray.push(fileName);
            fileBuffer[fileKey] = files[i];
            console.log(fileNameArray);
            $(textElementId).text(`${fileName}`);
            $(textElementId).css("color", "black");
            $(textElementId).css("border", "none");
            $(textElementId).css("textAlign", "start");
            $(textElementId).css("fontSize", "14px");
            $(deleteButtonId).data("fileName", fileName); // Almacenar el nombre del archivo en el botón

            if (fileNameArray.length == 2) {
              buttonPane.find("button").prop("disabled", false);
            }

            $(deleteButtonId).click(function (e) {
              console.log("delete button clicked");
              e.preventDefault();
              delete fileBuffer[fileKey];
              let fileNameToDelete = $(deleteButtonId).data("fileName");
              fileNameArray = fileNameArray.filter(
                (file) => file !== fileNameToDelete
              );
              console.log(fileNameArray);
              $(textElementId).text(defaultText);
              $(textElementId).css(stylePorDefecto);
              if (fileNameArray.length <= 1) {
                buttonPane.find("button").prop("disabled", true);
              }
            });
          }
        });
      }

      handleFileInput("#tdarg", "#drop-zone-arg", "#deleteArg", "argentina");
      handleFileInput("#tdlatin", "#drop-zone-latin", "#deleteLatin", "latin");
    },
    buttons: {
      EJECUTAR: async function () {
        let spinnerLoadingData = `
          <div id="spinnerContainer" style="display: flex; align-items: center; margin-right: 1rem;">
            <i class="fa fa-spinner fa-spin" style="font-size:16px"></i>
            <p style="margin-left: 0.5rem; font-size: 16px; font-weight: 600">Procesando diferencias</p>
          </div>
          `;

        const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
        buttonPane.find("button").prop("disabled", true);
        buttonPane.css("display", "flex");
        buttonPane.css("justify-content", "flex-end");
        buttonPane.find("#spinnerContainer").remove();
        $("#deleteArg").prop("disabled", true);
        $("#deleteLatin").prop("disabled", true);
        buttonPane.prepend(spinnerLoadingData);

        console.log("Ejecutando diferencias ARG-LATIN");
        const fileLatin = fileBuffer["latin"];
        const fileArgentina = fileBuffer["argentina"];

        const formData = new FormData();
        formData.append("file_latin", fileLatin);
        formData.append("file_argentina", fileArgentina);

        try {
          // Realizar el POST al backend
          const response = await fetch(
            "http://127.0.0.1:8000/procesar-diferencias-condor-latin/",
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            const error = await response.json();
            console.log(`Error: ${error.detail}`);
            return;
          }

          // Realizar el GET para obtener los datos procesados
          const getDataResponse = await fetch(
            "http://127.0.0.1:8000/obtener-diferencias-condor-latin/"
          );
          if (!getDataResponse.ok) {
            const getDataError = await getDataResponse.json();
            console.log(
              `Error al obtener datos procesados: ${getDataError.detail}`
            );
            return;
          }

          // Parsear los datos obtenidos
          // Parsear los datos obtenidos
          const getData = await getDataResponse.json();

          if (
            !getData.resultados ||
            Object.keys(getData.resultados).length === 0
          ) {
            $("#spinnerContainer").empty().append(`
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                      <i class="fa fa-info-circle" style="font-size: 16px; color: orange;"></i>
                      <p style="margin-top: 0px; font-size: 16px; font-weight: 600; color: orange;">
                        Sin diferencias.
                      </p>
                    </div>
                    `);
            buttonPane.find("button").prop("disabled", false);
            $("#deleteArg").prop("disabled", false);
            $("#deleteLatin").prop("disabled", false);
            return;
          }

          const resultados = Object.entries(getData.resultados).map(
            ([simbolo, valores]) => ({
              simbolo,
              qty_argentina: valores["Qty-argentina"],
              qty_latin: valores["Qty-latin"],
              qty_diferencias: valores["Qty-diferencias"],
            })
          );

          $("#tableDiferenciasARG-LATIN-Inicial").dataTable().fnDestroy();
          $("#tableDiferenciasARG-LATIN-Inicial").remove();

          // Destruir la tabla previa si existe
          if ($.fn.DataTable.isDataTable("#tableDiferenciasARG-LATIN")) {
            const table = $("#tableDiferenciasARG-LATIN").DataTable();
            table.clear();
            table.rows.add(resultados);
            table.draw();
          } else {
            // Inicializar la tabla con los nuevos datos
            $("#tableDiferenciasARG-LATIN").DataTable({
              data: resultados,
              autoWidth: true,
              searching: true,
              info: true,
              pageLength: calcularNumeroElementosPorPagina(),
              scrollCollapse: true,
              dom: "Bfrtip",
              buttons: [
                {
                  text: "Cargar Archivos",
                  action: function () {
                    modalArgentinaLatin.dialog("open");
                  },
                },
                {
                  extend: "excelHtml5",
                  customize: function (xlsx) {
                    var sheet = xlsx.xl.worksheets["sheet1.xml"];

                    // Aplicar estilo existente (ejemplo: 64)
                    $('row c[r^="B"]', sheet).attr("s", "64"); // Números normales
                    $('row c[r^="C"]', sheet).attr("s", "64"); // Números normales
                    $('row c[r^="D"]', sheet).attr("s", "64"); // Contabilidad (usa el estilo contable)
                  },
                  exportOptions: {
                    format: {
                      body: function (data, row, column, node) {
                        // Verificar si el dato es válido y convertirlo a cadena
                        if (typeof data !== "undefined" && data !== null) {
                          data = String(data).trim(); // Convertir a cadena y eliminar espacios

                          // Formatear columnas con números
                          if (column === 1 || column === 2 || column === 3) {
                            // Formato para español: Decimales con coma y miles con punto
                            data = data.replace(/[^\d,-]/g, ""); // Eliminar caracteres no numéricos
                            // eliminar decimales
                            data = data.split(",")[0];
                            console.log(data);
                            return data; // Devolver dato formateado
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
                  targets: [1, 2, 3],
                  data: function (row, type, val, meta) {
                    if (type === "set") {
                      row[meta.col] = val;
                      return;
                    } else if (type === "display") {
                      return formatNumber(row[meta.col], 0);
                    }
                    return row[meta.col];
                  },
                },
              ],
              columns: [
                { title: "Simbolo", data: "simbolo" },
                {
                  title: "Cantidad Condor",
                  data: "qty_argentina",
                  render: function (data, type, row, meta) {
                    return formatNumber(data, 0);
                  },
                },
                {
                  title: "Cantidad Latin",
                  data: "qty_latin",
                  render: function (data, type, row, meta) {
                    return formatNumber(data, 0);
                  },
                },
                {
                  title: "Diferencias",
                  data: "qty_diferencias",
                  render: function (data, type, row, meta) {
                    return formatNumber(data, 0);
                  },
                },
              ],
            });
          }
        } catch (error) {
          console.error(`Ocurrió un error: ${error.message}`);
        } finally {
          const spinnerText = $("#spinnerContainer").find("p").text();
          if (!spinnerText.includes("Sin diferencias.")) {
            $("#spinnerContainer").remove();
          }
          buttonPane.find("button").prop("disabled", false);
          $("#deleteArg").prop("disabled", false);
          $("#deleteLatin").prop("disabled", false);
        }

        // Cerrar el modal
        $(this).dialog("close");
      },
    },
    close: () => {
      // quiero eliminar todo los inputs con el id de file-input
      $("input#file-input").remove();
      $("input#file-input").empty();
      const stylePorDefecto = {
        border: "2px dashed #ccc",
        borderRadius: "0px",
        width: "290px",
        height: "auto",
        alignContent: "center",
        textAlign: "center",
        fontSize: "16px",
        color: "#ccc",
        margin: "5px 0px",
      };
      // queiro que cuando se cierre el modal se limpie el fileBuffer y también los textos de los dropzones
      $("#drop-zone-arg").text("Haga click o arrastre el archivo aqui");
      $("#drop-zone-arg").css(stylePorDefecto);
      $("#drop-zone-latin").text("Haga click o arrastre el archivo aqui");
      $("#drop-zone-latin").css(stylePorDefecto);
      $("#spinnerContainer").hide(); // Aseguramos que el spinnerContainer se esconda
      fileBuffer = {};
    },
  });

  $("#tableDiferenciasTRANSACTIONS-CONVERS-Inicial").dataTable({
    title: "Diferencias Transactions Convers",
    autoWidth: false,
    scrollCollapse: true,
    dom: "Bfrtip",
    buttons: [
      {
        text: "Cargar Archivos",
        action: function () {
          modalTransactionsConvers.dialog("open");
        },
      },
      {
        extend: "excelHtml5",
      },
    ],
  });

  const modalTransactionsConvers = $("#modalTransactionsConvers").dialog({
    title: "Ejecutar Diferencias Transactions-Convers",
    autoOpen: false,
    modal: true,
    width: "auto",
    height: "auto",
    resizable: false,
    open: function () {
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", true);
      buttonPane.css("display", "flex");
      buttonPane.css("justify-content", "flex-end");

      let fileNameArray = [];

      function handleFileInput(
        dropZoneId,
        textElementId,
        deleteButtonId,
        fileKey
      ) {
        const defaultText = $(textElementId).text();
        const defaultStyle = {
          border: "2px dashed #ccc",
          borderRadius: "0px",
          width: "290px",
          height: "auto",
          alignContent: "center",
          textAlign: "center",
          fontSize: "16px",
          color: "#ccc",
          margin: "5px 0px",
        };
        $(dropZoneId)
          .off("click")
          .on("click", function (e) {
            e.preventDefault();
            let fileInput = $(
              `<input type="file" id="file-input" style="display: none;" />`
            );
            $("main").append(fileInput);
            fileInput.click();
            fileInput.on("change", function () {
              let files = fileInput[0].files;
              for (let i = 0; i < files.length; i++) {
                let fileName = files[i].name;
                fileBuffer[fileKey] = files[i];
                console.log(fileBuffer);
                fileNameArray.push(fileName);
                console.log(fileNameArray);

                $(textElementId).text(`${fileName}`);
                $(textElementId).css("color", "black");
                $(textElementId).css("fontSize", "14px");
                $(textElementId).css("border", "none");
                $(textElementId).css("textAlign", "start");
                $(deleteButtonId).data("fileName", fileName); // Almacenar el nombre del archivo en el botón

                if (fileNameArray.length == 2) {
                  buttonPane.find("button").prop("disabled", false);
                  console.log("Activando botón");
                }

                $(deleteButtonId)
                  .off("click")
                  .on("click", function (e) {
                    console.log("delete button clicked");
                    e.preventDefault();
                    delete fileBuffer[fileKey];
                    let fileNameToDelete = $(deleteButtonId).data("fileName");
                    fileNameArray = fileNameArray.filter(
                      (file) => file !== fileNameToDelete
                    );
                    console.log(fileNameArray);
                    $(textElementId).text(defaultText);
                    $(textElementId).css(defaultStyle);
                    if (fileNameArray.length <= 1) {
                      buttonPane.find("button").prop("disabled", true);
                    }
                  });
              }

              fileInput.remove();
            });
          });

        $(dropZoneId).on("dragover", function (e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).addClass("dragged");
        });
        $(dropZoneId).on("dragleave", function (e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).removeClass("dragged");
        });
        $(dropZoneId).on("drop", function (e) {
          e.preventDefault();
          e.stopPropagation();
          $(this).removeClass("dragged");

          let files = e.originalEvent.dataTransfer.files;
          if (files.length > 1) {
            return;
          }

          for (let i = 0; i < files.length; i++) {
            let fileName = files[i].name;
            fileNameArray.push(fileName);
            fileBuffer[fileKey] = files[i];
            console.log(fileNameArray);
            $(textElementId).text(`${fileName}`);
            $(textElementId).css("color", "black");
            $(textElementId).css("border", "none");
            $(textElementId).css("textAlign", "start");
            $(textElementId).css("fontSize", "14px");
            $(deleteButtonId).data("fileName", fileName); // Almacenar el nombre del archivo en el botón

            if (fileNameArray.length == 2) {
              buttonPane.find("button").prop("disabled", false);
            }

            $(deleteButtonId).click(function (e) {
              console.log("delete button clicked");
              e.preventDefault();
              delete fileBuffer[fileKey];
              let fileNameToDelete = $(deleteButtonId).data("fileName");
              fileNameArray = fileNameArray.filter(
                (file) => file !== fileNameToDelete
              );
              console.log(fileNameArray);
              $(textElementId).text(defaultText);
              $(textElementId).css(stylePorDefecto);
              if (fileNameArray.length <= 1) {
                buttonPane.find("button").prop("disabled", true);
              }
            });
          }
        });
      }

      handleFileInput(
        "#tdtransactions",
        "#drop-zone-transactions",
        "#btnTransactions",
        "transactions"
      );
      handleFileInput(
        "#tdconvers",
        "#drop-zone-convers",
        "#btnConvers",
        "convers"
      );
    },
    buttons: {
      EJECUTAR: async function () {
        let spinnerLoadingData = `
          <div id="spinnerContainer" style="display: flex; align-items: center; margin-right: 1rem;">
            <i class="fa fa-spinner fa-spin" style="font-size:16px"></i>
            <p style="margin-left: 0.5rem; font-size: 16px; font-weight: 600">Procesando diferencias</p>
          </div>
        `;

        const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
        buttonPane.find("button").prop("disabled", true);
        buttonPane.css("display", "flex");
        buttonPane.css("justify-content", "flex-end");
        buttonPane.find("#spinnerContainer").remove();
        $("#btnTransactions").prop("disabled", true);
        $("#btnConvers").prop("disabled", true);
        buttonPane.prepend(spinnerLoadingData);

        console.log("Ejecutando diferencias TRANSACTIONS-CONVERS");
        const fileTransactions = fileBuffer["transactions"];
        const fileConvers = fileBuffer["convers"];

        const formData = new FormData();
        formData.append("file_transactions", fileTransactions);
        formData.append("file_convers", fileConvers);

        try {
          // Realizar el POST al backend
          const response = await fetch(
            "http://127.0.0.1:8000/procesar-transactions-convers/",
            {
              method: "POST",
              body: formData,
            }
          );

          if (!response.ok) {
            const error = await response.json();
            console.log(`Error: ${error.detail}`);
            return;
          }

          console.log("POST ejecutado correctamente.");

          // Realizar el GET para obtener los datos procesados
          const getDataResponse = await fetch(
            "http://127.0.0.1:8000/obtener-diferencias-trasactions-convers/"
          );
          if (!getDataResponse.ok) {
            const getDataError = await getDataResponse.json();
            console.log(
              `Error al obtener datos procesados: ${getDataError.detail}`
            );

            return;
          }

          const getData = await getDataResponse.json(); // Parsear los datos obtenidos

          if (
            !getData.resultados ||
            Object.keys(getData.resultados).length === 0
          ) {
            $("#spinnerContainer").empty().append(`
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <i class="fa fa-info-circle" style="font-size: 16px; color: orange;"></i>
                <p style="margin-top: 0px; font-size: 16px; font-weight: 600; color: orange;">
                  Sin diferencias.
                </p>
              </div>
            `);
            buttonPane.find("button").prop("disabled", false);
            $("#btnTransactions").prop("disabled", false);
            $("#btnConvers").prop("disabled", false);
            return;
          }

          const resultados = Object.entries(getData.resultados).map(
            ([simbolo, valores]) => ({
              simbolo,
              qty_transactions: valores["Qty-transfer"],
              qty_convers: valores["Qty-control"],
              qty_diferencias: valores["Qty-diferencias"],
            })
          );

          console.log(resultados);

          $("#tableDiferenciasTRANSACTIONS-CONVERS-Inicial")
            .dataTable()
            .fnDestroy();
          $("#tableDiferenciasTRANSACTIONS-CONVERS-Inicial").remove();

          if (
            $.fn.DataTable.isDataTable("#tableDiferenciasTRANSACTIONS-CONVERS")
          ) {
            const table = $(
              "#tableDiferenciasTRANSACTIONS-CONVERS"
            ).DataTable();
            table.clear();
            table.rows.add(resultados);
            table.draw();
          } else {
            $("#tableDiferenciasTRANSACTIONS-CONVERS").DataTable({
              data: resultados,
              autoWidth: true,
              searching: true,
              info: true,
              pageLength: calcularNumeroElementosPorPagina(),
              scrollCollapse: true,
              dom: "Bfrtip",
              buttons: [
                {
                  text: "Cargar Archivos",
                  action: function () {
                    modalTransactionsConvers.dialog("open");
                  },
                },
                {
                  extend: "excelHtml5",
                  customize: function (xlsx) {
                    var sheet = xlsx.xl.worksheets["sheet1.xml"];

                    // Aplicar estilo existente (ejemplo: 64)
                    $('row c[r^="B"]', sheet).attr("s", "64"); // Números normales
                    $('row c[r^="C"]', sheet).attr("s", "64"); // Números normales
                    $('row c[r^="D"]', sheet).attr("s", "64"); // Contabilidad (usa el estilo contable)
                  },
                  exportOptions: {
                    format: {
                      body: function (data, row, column, node) {
                        // Verificar si el dato es válido y convertirlo a cadena
                        if (typeof data !== "undefined" && data !== null) {
                          data = String(data).trim(); // Convertir a cadena y eliminar espacios

                          // Formatear columnas con números
                          if (column === 1 || column === 2 || column === 3) {
                            // Formato para español: Decimales con coma y miles con punto
                            data = data.replace(/[^\d-]/g, ""); // Eliminar caracteres no numéricos
                            return data; // Devolver dato formateado
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
                  targets: [1, 2, 3],
                  data: function (row, type, val, meta) {
                    if (type === "set") {
                      row[meta.col] = val;
                      return;
                    } else if (type === "display") {
                      return formatNumber(row[meta.col], 0);
                    }
                    return row[meta.col];
                  },
                },
              ],
              columns: [
                { title: "Simbolo", data: "simbolo" },
                {
                  title: "Cantidad Transactions",
                  data: "qty_transactions",
                  render: function (data, type, row, meta) {
                    return formatNumber(data, 0);
                  },
                },
                {
                  title: "Cantidad Conversiones",
                  data: "qty_convers",
                  render: function (data, type, row, meta) {
                    return formatNumber(data, 0);
                  },
                },
                {
                  title: "Diferencias",
                  data: "qty_diferencias",
                  render: function (data, type, row, meta) {
                    return formatNumber(data, 0);
                  },
                },
              ],
            });
          }
        } catch (error) {
          console.error(`Ocurrió un error: ${error.message}`);
        } finally {
          const spinnerText = $("#spinnerContainer").find("p").text();
          if (!spinnerText.includes("Sin diferencias.")) {
            $("#spinnerContainer").hide();
          }
          buttonPane.find("button").prop("disabled", false);
          $("#btnTransactions").prop("disabled", false);
          $("#btnConvers").prop("disabled", false);
        }

        $(this).dialog("close");
      },
    },
    close: function () {
      // quiero eliminar todo los inputs con el id de file-input
      $("input#file-input").remove();
      $("input#file-input").empty();
      const stylePorDefecto = {
        border: "2px dashed #ccc",
        borderRadius: "0px",
        width: "290px",
        height: "auto",
        alignContent: "center",
        textAlign: "center",
        fontSize: "16px",
        color: "#ccc",
        margin: "5px 0px",
      };
      const buttonPane = $(this).parent().find(".ui-dialog-buttonpane");
      buttonPane.find("button").prop("disabled", false);
      // queiro que cuando se cierre el modal se limpie el fileBuffer y también los textos de los dropzones
      $("#drop-zone-transactions").text(
        "Haga click o arrastre el archivo aqui"
      );
      $("#drop-zone-transactions").css(stylePorDefecto);
      $("#drop-zone-convers").text("Haga click o arrastre el archivo aqui");
      $("#drop-zone-convers").css(stylePorDefecto);
      $("#btnTransactions").prop("disabled", false);
      $("#btnConvers").prop("disabled", false);
      $("#spinnerContainer").hide();
      fileBuffer = {};
    },
  });

  const socket = io("http://192.168.10.203:5000", {
    transports: ["websocket"],
  });

  // Solicitar los datos al servidor al conectar
  socket.on("connect", () => {
    console.log("✅ Conectado al servidor, solicitando snapshot...");
    socket.emit("SNAPSHOT_REQUEST"); // Enviar petición al servidor
  });

  // Manejar eventos del snapshot
  $("#loading-data").on("click", function () {
    $("#loading-data").html(`
      <span style="display: flex; align-items: center; gap: 8px">
        <p style="margin-left: 0.5rem; font-size: 14px;">Cargando datos</p>
        <i class="fa fa-spinner fa-spin" style="font-size:16px"></i>
      </span>
      `);
    socket.on("SNAPSHOT_BEGIN", () => {
      console.log("📡 SNAPSHOT_BEGIN recibido");
      if ($.fn.DataTable.isDataTable("#tableSecurityList")) {
        const table = $("#tableSecurityList").DataTable();
        table.draw(false);
      }
    });

    // setTimeout((segundo) => {
    //   segundo = 1000;
    //   $("#loading-data").html(`
    //   <span style="display: flex; align-items: center; gap: 8px">
    //     <p style="margin-left: 0.5rem; font-size: 14px;">Error cargando datos</p>
    //     <i class="fa fa-exclamation-triangle" style="font-size:16px; color: red;"></i>
    //   </span>
    // `);
    // }, segundo * 10);

    socket.on("SNAPSHOT_DATA", (data) => {
      try {
        console.log("📡 SNAPSHOT_DATA recibido");
        let parsedData = JSON.parse(data);

        if ($.fn.DataTable.isDataTable("#tableSecurityList")) {
          const table = $("#tableSecurityList").DataTable();
          table.rows.add(parsedData).draw(false);
        } else {
          $("#tableSecurityList").DataTable({
            data: parsedData,
            autoWidth: true,
            scrollX: true,
            scrollY: "69vh",
            pageLength: calcularNumeroElementosPorPagina(),
            scrollCollapse: true,
            deferRender: true,
            dom: "Bfrtip",
            buttons: [
              {
                extend: "excelHtml5",
              },
            ],
            columns: [
              { data: "id_security", title: "ID Security" },
              { data: "symbol", title: "Symbol" },
              { data: "security_type", title: "Security Type" },
              { data: "currency", title: "Currency" },
              { data: "cfi_code", title: "CFI Code" },
              { data: "security_id", title: "Security ID" },
              { data: "security_exchange", title: "Security Exchange" },
              { data: "security_status", title: "Security Status" },
              { data: "security_category", title: "Security Category" },
              { data: "security_subtype", title: "Security Subtype" },
              { data: "product", title: "Product" },
              { data: "issuer", title: "Issuer" },
              { data: "security_desc", title: "Security Description" },
              { data: "issue_date", title: "Issue Date" },
              { data: "round_lot", title: "Round Lot" },
              { data: "factor", title: "Factor" },
              { data: "contract_multiplier", title: "Contract Multiplier" },
              { data: "maturity_date", title: "Maturity Date" },
              { data: "underlying_symbol", title: "Underlying Symbol" },
              {
                data: "underlying_security_id",
                title: "Underlying Security ID",
              },
              { data: "trading_session_id", title: "Trading Session ID" },
              { data: "ord_type", title: "Order Type" },
              { data: "time_in_force", title: "Time in Force" },
              { data: "trad_ses_status", title: "Trading Session Status" },
              { data: "is_active", title: "Is Active" },
              { data: "md_req_id", title: "MD Request ID" },
            ],
          });
        }
      } catch (error) {
        console.error("⚠️ Error procesando datos:", error);
      }
    });

    socket.on("SNAPSHOT_END", () => {
      console.log("✅ SNAPSHOT_END recibido, datos cargados");
      // Destruir y eliminar la tabla inicial
      $("#loading-data").remove();
    });
  });

  // Manejar la desconexión
  socket.on("disconnect", () => {
    console.log("❌ Desconectado del WebSocket");
  });
});
