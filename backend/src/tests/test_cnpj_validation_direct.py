from validate_docbr import CNPJ

def test_validate_docbr_confirmed_cnpjs():
    cnpj_validator = CNPJ()

    # CNPJs confirmados como VÁLIDOS pela validate_docbr no ambiente de teste
    cnpjs_validos_confirmados = {
        "Petrobras": "33.000.167/0001-01",
        "Vale": "33.592.510/0001-54",
        "Bradesco": "60.746.948/0001-12",
    }

    for nome_empresa, cnpj_str in cnpjs_validos_confirmados.items():
        is_valid = cnpj_validator.validate(cnpj_str)
        print(f"CNPJ {nome_empresa} ({cnpj_str}): {'Válido' if is_valid else 'Inválido'} pela validate_docbr")
        assert is_valid, f"CNPJ da {nome_empresa} ({cnpj_str}) deveria ser válido, mas foi considerado inválido pela validate_docbr."

        cnpj_limpo = ''.join(filter(str.isdigit, cnpj_str))
        is_valid_limpo = cnpj_validator.validate(cnpj_limpo)
        print(f"CNPJ limpo {nome_empresa} ({cnpj_limpo}): {'Válido' if is_valid_limpo else 'Inválido'} pela validate_docbr")
        assert is_valid_limpo, f"CNPJ limpo da {nome_empresa} ({cnpj_limpo}) deveria ser válido."

    # CNPJs confirmados como INVÁLIDOS pela validate_docbr
    cnpjs_invalidos_confirmados = [
        "48.136.030/0001-00", # O que falhou no teste anterior
        "11.111.111/1111-11",
        "12.345.678/0001-00",
        "99.999.999/9999-99",
        "33.000.167/0001-00", # Petrobras com dígito errado
    ]
    for cnpj_str in cnpjs_invalidos_confirmados:
        is_invalid = not cnpj_validator.validate(cnpj_str)
        # print(f"CNPJ Inválido Teste ({cnpj_str}): {'Corretamente Inválido' if is_invalid else 'Erroneamente Válido'} pela validate_docbr")
        assert is_invalid, f"CNPJ {cnpj_str} deveria ser inválido, mas foi considerado válido."
